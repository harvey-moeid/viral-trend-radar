import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./worker";

const TOKEN = "test-app-token";
const env = { APP_API_TOKEN: TOKEN, YOUTUBE_API_KEY: "test-youtube-key" };

let ipCounter = 0;
// Each test uses its own client IP so the in-memory rate limiter never leaks between tests.
const search = (ip = `203.0.113.${(ipCounter += 1)}`) =>
  worker.fetch(
    new Request("https://worker.test/api/youtube/search?q=tarot", {
      headers: { authorization: `Bearer ${TOKEN}`, "cf-connecting-ip": ip },
    }),
    env,
  );

const mockFetch = (impl: () => Promise<Response>) => vi.spyOn(globalThis, "fetch").mockImplementation(impl);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("YouTube search upstream handling", () => {
  it("maps a successful upstream response and never exposes the API key", async () => {
    const spy = mockFetch(async () =>
      Response.json({
        items: [
          {
            id: { videoId: "abc123" },
            snippet: {
              title: "Tarot",
              channelTitle: "Channel",
              publishedAt: "2026-01-01T00:00:00Z",
              thumbnails: { medium: { url: "https://img.test/a.jpg" } },
            },
          },
          { id: {}, snippet: { title: "no video id" } },
        ],
      }),
    );
    const response = await search();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          id: "abc123",
          title: "Tarot",
          channelTitle: "Channel",
          publishedAt: "2026-01-01T00:00:00Z",
          thumbnail: "https://img.test/a.jpg",
          url: "https://www.youtube.com/watch?v=abc123",
        },
      ],
      storage: "none",
      mode: "discovery-only",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns 502 with upstreamStatus for a non-JSON error response instead of crashing", async () => {
    mockFetch(async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    const response = await search();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "YouTube API request failed", upstreamStatus: 502 });
  });

  it("exposes upstream 400 (invalid API key) as upstreamStatus without leaking the body", async () => {
    mockFetch(async () => new Response('{"error":{"message":"API key not valid"}}', { status: 400 }));
    const response = await search();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "YouTube API request failed", upstreamStatus: 400 });
  });

  it("returns the quota error for an upstream 403 with a non-JSON body", async () => {
    mockFetch(async () => new Response("Forbidden", { status: 403 }));
    const response = await search();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "YouTube quota/permission error", upstreamStatus: 403 });
  });

  it("returns 502 when a 200 response is not valid JSON", async () => {
    mockFetch(async () => new Response("not json", { status: 200 }));
    const response = await search();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "YouTube API returned an invalid response" });
  });

  it.each([["null"], ["[]"], ['"text"'], ['{"items":"nope"}']])(
    "returns 502 when a 200 response has an unexpected shape (%s)",
    async (body) => {
      mockFetch(async () => new Response(body, { status: 200 }));
      const response = await search();
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "YouTube API returned an invalid response" });
    },
  );

  it("returns an empty list when the upstream response has no items", async () => {
    mockFetch(async () => Response.json({}));
    const response = await search();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], storage: "none", mode: "discovery-only" });
  });

  it("returns 502 with reason=network when the upstream request fails at the network level", async () => {
    mockFetch(async () => {
      throw new TypeError("network down");
    });
    const response = await search();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "YouTube API request failed", reason: "network" });
  });

  it("returns 504 when the upstream request times out", async () => {
    mockFetch(async () => {
      throw new DOMException("The operation timed out", "TimeoutError");
    });
    const response = await search();
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: "YouTube API timeout" });
  });
});

describe("YouTube search rate limiting", () => {
  it("returns 429 with Retry-After after the per-minute limit is exceeded", async () => {
    const spy = mockFetch(async () => Response.json({ items: [] }));
    const ip = "198.51.100.77";
    for (let index = 0; index < 10; index += 1) {
      expect((await search(ip)).status).toBe(200);
    }
    const blocked = await search(ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(await blocked.json()).toEqual({ error: "Terlalu banyak permintaan YouTube, coba lagi nanti" });
    // The blocked request must not reach YouTube and spend quota.
    expect(spy).toHaveBeenCalledTimes(10);
  });

  it("limits each client independently", async () => {
    mockFetch(async () => Response.json({ items: [] }));
    const first = "198.51.100.88";
    for (let index = 0; index < 10; index += 1) await search(first);
    expect((await search(first)).status).toBe(429);
    expect((await search("198.51.100.89")).status).toBe(200);
  });

  it("does not spend rate-limit budget on unauthorized or invalid requests", async () => {
    const spy = mockFetch(async () => Response.json({ items: [] }));
    const ip = "198.51.100.99";
    for (let index = 0; index < 15; index += 1) {
      const unauthorized = await worker.fetch(
        new Request("https://worker.test/api/youtube/search?q=tarot", {
          headers: { "cf-connecting-ip": ip },
        }),
        env,
      );
      expect(unauthorized.status).toBe(401);
      const invalid = await worker.fetch(
        new Request("https://worker.test/api/youtube/search?q=x", {
          headers: { authorization: `Bearer ${TOKEN}`, "cf-connecting-ip": ip },
        }),
        env,
      );
      expect(invalid.status).toBe(400);
    }
    expect((await search(ip)).status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

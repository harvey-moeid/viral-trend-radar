import { describe, expect, it } from "vitest";
import worker from "./worker";

const TOKEN = "test-app-token";
const protectedRequests = [
  { name: "GET /api/research", request: () => new Request("https://worker.test/api/research") },
  {
    name: "POST /api/research",
    request: () => new Request("https://worker.test/api/research", { method: "POST", body: "{}" }),
  },
  { name: "GET /api/youtube/search", request: () => new Request("https://worker.test/api/youtube/search?q=tarot") },
];

describe("Worker API authorization", () => {
  it.each(protectedRequests)("returns 503 for $name when APP_API_TOKEN is not configured", async ({ request }) => {
    const response = await worker.fetch(request(), {});
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "API token belum dikonfigurasi" });
  });

  it.each(protectedRequests)("returns 401 for $name when the bearer token is missing", async ({ request }) => {
    const response = await worker.fetch(request(), { APP_API_TOKEN: TOKEN });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it.each([
    ["wrong token", "Bearer incorrect-token"],
    ["wrong case", "bearer " + TOKEN],
    ["wrong scheme", "Basic " + TOKEN],
    ["matching prefix only", "Bearer " + TOKEN.slice(0, -1)],
    ["matching token plus suffix", "Bearer " + TOKEN + "x"],
    ["empty bearer", "Bearer "],
  ])("rejects %s on every protected route", async (_name, authorization) => {
    for (const { request } of protectedRequests) {
      const req = request();
      req.headers.set("authorization", authorization);
      const response = await worker.fetch(req, { APP_API_TOKEN: TOKEN });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    }
  });

  it("accepts the exact bearer token and continues to the protected handler", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/research", {
        headers: { authorization: "Bearer " + TOKEN },
      }),
      { APP_API_TOKEN: TOKEN },
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "D1 belum dikonfigurasi" });
  });

  it("checks authorization before checking YouTube configuration", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/youtube/search?q=tarot"),
      { APP_API_TOKEN: TOKEN },
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it.each(["", "x", " ".repeat(121)])("rejects an invalid YouTube query (%j) with 400", async (query) => {
    const response = await worker.fetch(
      new Request(`https://worker.test/api/youtube/search?q=${encodeURIComponent(query)}`, {
        headers: { authorization: `Bearer ${TOKEN}` },
      }),
      { APP_API_TOKEN: TOKEN, YOUTUBE_API_KEY: "test-youtube-key" },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Query harus 2–120 karakter" });
  });
});
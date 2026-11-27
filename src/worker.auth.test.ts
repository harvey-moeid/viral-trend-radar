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
  it.each(protectedRequests)("$name returns 503 when APP_API_TOKEN is not configured", async ({ request }) => {
    const response = await worker.fetch(request(), {});
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "API token belum dikonfigurasi" });
  });

  it.each(protectedRequests)("$name returns 401 when the bearer token is missing", async ({ request }) => {
    const response = await worker.fetch(request(), { APP_API_TOKEN: TOKEN });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it.each(protectedRequests)("$name returns 401 when the bearer token is incorrect", async ({ request }) => {
    const req = request();
    req.headers.set("authorization", "Bearer incorrect-token");
    const response = await worker.fetch(req, { APP_API_TOKEN: TOKEN });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("checks authorization before checking YouTube configuration", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/api/youtube/search?q=tarot"),
      { APP_API_TOKEN: TOKEN },
    );
    expect(response.status).toBe(401);
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

export interface Env {
  VTR_DB?: D1Database;
  APP_API_TOKEN?: string;
  YOUTUBE_API_KEY?: string;
  ASSETS?: Fetcher;
}

type Input = {
  title: string;
  creator: string;
  url: string;
  region: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  hashtags?: string;
  notes?: string;
};

const reply = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "same-origin",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    },
  });

const count = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);

function valid(value: unknown): value is Input {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.title === "string" &&
    input.title.trim().length > 0 &&
    input.title.length <= 180 &&
    typeof input.creator === "string" &&
    input.creator.trim().length > 0 &&
    input.creator.length <= 100 &&
    typeof input.url === "string" &&
    /^https:\/\/(www\\.)?tiktok\\.com\\//i.test(input.url) &&
    input.url.length <= 2048 &&
    ["ID", "GLOBAL"].includes(String(input.region)) &&
    count(input.views) &&
    count(input.likes) &&
    count(input.comments) &&
    count(input.shares) &&
    String(input.hashtags ?? "").length <= 500 &&
    String(input.notes ?? "").length <= 1000
  );
}

/**
 * Compare fixed-length SHA-256 digests so the final equality check does not
 * reveal the bearer token's matching prefix or original length.
 */
async function constantTimeTokenMatch(expected: string, provided: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [expectedDigest, providedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
  ]);
  const left = new Uint8Array(expectedDigest);
  const right = new Uint8Array(providedDigest);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function authorize(req: Request, env: Env): Promise<Response | null> {
  if (!env.APP_API_TOKEN) {
    return reply({ error: "API token belum dikonfigurasi" }, 503);
  }

  const authorization = req.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!(await constantTimeTokenMatch(env.APP_API_TOKEN, provided))) {
    return reply({ error: "Unauthorized" }, 401);
  }
  return null;
}

async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const protectedRoute =
    (path === "/api/research" && (req.method === "GET" || req.method === "POST")) ||
    (path === "/api/youtube/search" && req.method === "GET");

  if (path === "/api/health" && req.method === "GET") {
    return reply({
      ok: true,
      database: !!env.VTR_DB,
      youtubeDiscovery: !!env.YOUTUBE_API_KEY,
      mode: "discovery-only",
    });
  }

  if (protectedRoute) {
    const denied = await authorize(req, env);
    if (denied) return denied;
  }

  if (path === "/api/research" && req.method === "GET") {
    if (!env.VTR_DB) return reply({ error: "D1 belum dikonfigurasi" }, 503);
    const result = await env.VTR_DB.prepare(
      "SELECT id,title,creator,region,views,likes,created_at FROM research_records ORDER BY created_at DESC LIMIT 100",
    ).all();
    return reply({ items: result.results ?? [] });
  }

  if (path === "/api/research" && req.method === "POST") {
    if (!env.VTR_DB) return reply({ error: "D1 belum dikonfigurasi" }, 503);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return reply({ error: "JSON tidak valid" }, 400);
    }
    if (!valid(body)) return reply({ error: "Input tidak valid" }, 400);
    const result = await env.VTR_DB.prepare(
      "INSERT INTO research_records(platform,title,creator,url,region,views,likes,comments,shares,hashtags,notes) VALUES('tiktok',?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        body.title.trim(),
        body.creator.trim(),
        body.url,
        body.region,
        body.views,
        body.likes,
        body.comments,
        body.shares,
        body.hashtags ?? "",
        body.notes ?? "",
      )
      .run();
    return reply({ ok: true, id: result.meta.last_row_id }, 201);
  }

  if (path === "/api/youtube/search" && req.method === "GET") {
    if (!env.YOUTUBE_API_KEY) return reply({ error: "YOUTUBE_API_KEY belum dikonfigurasi" }, 503);
    const query = (url.searchParams.get("q") ?? "").trim();
    if (query.length < 2 || query.length > 120) {
      return reply({ error: "Query harus 2–120 karakter" }, 400);
    }

    const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
    endpoint.search = new URLSearchParams({
      part: "snippet",
      type: "video",
      maxResults: "12",
      q: query,
      key: env.YOUTUBE_API_KEY,
    }).toString();
    const upstream = await fetch(endpoint);
    const data = (await upstream.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          publishedAt?: string;
          thumbnails?: { medium?: { url?: string } };
        };
      }>;
    };
    if (!upstream.ok) {
      return reply(
        { error: upstream.status === 403 ? "YouTube quota/permission error" : "YouTube API request failed" },
        502,
      );
    }
    const items = (data.items ?? [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        id: item.id!.videoId!,
        title: item.snippet?.title ?? "",
        channelTitle: item.snippet?.channelTitle ?? "",
        publishedAt: item.snippet?.publishedAt ?? "",
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? "",
        url: "https://www.youtube.com/watch?v=" + item.id!.videoId,
      }));
    return reply({ items, storage: "none", mode: "discovery-only" });
  }

  if (env.ASSETS) return env.ASSETS.fetch(req);
  return reply({ error: "Not found" }, 404);
}

export default {
  async fetch(req: Request, env: Env) {
    if (req.method === "OPTIONS") return reply(null, 204);
    try {
      return await handle(req, env);
    } catch {
      return reply({ error: "Internal server error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
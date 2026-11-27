# Viral Trend Radar
Android-first research console for YouTube discovery and manually collected TikTok research.

## Compliance mode
YouTube Data API is discovery-only: results are ephemeral, not stored, scored, aggregated across channels, or historically tracked. TikTok is manual entry only. No scraping, private endpoints, cookies, browser automation, Apify, or video downloading.

## Stack
React + TypeScript + Vite PWA shell, Cloudflare Worker API, D1, GitHub Actions. Free-tier-first; no paid services.

## Local
npm install
npm run dev

Copy .dev.vars.example to .dev.vars for local secrets. Configure a D1 binding named VTR_DB in wrangler.jsonc after provisioning. Apply migrations/0001_init.sql.

## Secrets
Worker secrets: APP_API_TOKEN and optional YOUTUBE_API_KEY. GitHub production environment secrets: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.

Deploy is manual-only through GitHub Actions. Do not enable public production use until authentication is protected by Cloudflare Access or equivalent.

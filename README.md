# Viral Trend Radar
Android-first research console for YouTube discovery and manually collected TikTok research.

## Compliance mode
YouTube Data API is discovery-only: results are ephemeral, not stored, scored, aggregated across channels, or historically tracked. TikTok is manual entry only. No scraping, private endpoints, cookies, browser automation, Apify, or video downloading.

## Stack
React + TypeScript + Vite PWA shell, Cloudflare Worker API, D1, GitHub Actions. Free-tier-first; no paid services.

## Local
```sh
npm ci
npm run dev
npm run licenses
``

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Configure the D1 binding `VTR_DB` in `wrangler.jsonc` and apply versioned migrations with:

```sh
npx wrangler d1 migrations apply viral-trend-radar-db --local
``

Do not execute migration SQL manually in a deployed database. Add schema changes as new, sequential files under `migrations/`; never edit a migration that has already been applied. CI applies all migrations to an isolated local D1 database and verifies the migration list.

## Production deployment
Deploy is manual-only through GitHub Actions (`workflow_dispatch`) on `main`. The workflow applies pending remote D1 migrations before deploying the Worker. Cloudflare captures a D1 backup when applying migrations. Configure GitHub production environment secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Worker secrets: `APP_API_TOKEN` and optional `YOUTUBE_API_KEY`. Do not enable public production use until authentication is protected by Cloudflare Access or equivalent.

## Project handoff
See [docs/HANDOFF.md](docs/HANDOFF.md) for completed audit items, current work, operational constraints, verification commands, and the next audit queue.

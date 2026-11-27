# Project Handoff — Viral Trend Radar

Updated: 2026-11-27

## Repository
- GitHub: https://github.com/harvey-moeid/viral-trend-radar
- Production branch: `main`
- Stack: React + TypeScript + Vite, Cloudflare Worker, Cloudflare D1, GitHub Actions.
- Deployment policy: production deployment is manual-only. Never trigger production deployment without explicit owner confirmation.

## Completed audit work
1. Lockfile and deterministic install: `package-lock.json`, `npm ci --ignore-scripts`, Node.js 22.
2. Worker authorization regression tests: missing/misconfigured/wrong token and input validation.
3. D1 migration handling: CI applies migrations to isolated local D1; manual production workflow applies pending remote migrations before Worker deploy.
4. Shared authorization helper and constant-time bearer-token comparison.
5. YouTube upstream error handling and rate limiting, merged in PR #8.

## In progress
- Audit point 6: PWA manifest icons and app-shell cache hardening, PR #9 (open; owner merge pending).
- Audit point 7: dependency license policy and CI failure handling, current branch `audit/license-policy`; PR pending.

## Merged pull requests
- PR #4 — https://github.com/harvey-moeid/viral-trend-radar/pull/4
- PR #5 — https://github.com/harvey-moeid/viral-trend-radar/pull/5
- PR #6 — https://github.com/harvey-moeid/viral-trend-radar/pull/6
- PR #8 — https://github.com/harvey-moeid/viral-trend-radar/pull/8

## Known architecture and constraints
- D1 binding: `VTR_DB`; database: `viral-trend-radar-db`.
- Worker secrets: `APP_API_TOKEN`; optional `YOUTUBE_API_KEY`.
- YouTube Data API remains discovery-only: results are ephemeral and are not stored or historically tracked.
- TikTok research is manual entry only. No scraping, private endpoints, cookies, browser automation, or video downloading.
- Remote D1 migrations are versioned under `migrations/`. Add a new sequential SQL file for schema changes; do not edit an already-applied migration.
- Production deploy workflow: GitHub Actions `Deploy Cloudflare Worker`, manual `workflow_dispatch` on `main`, with the production environment gate.

## Verification commands
```sh
npm ci --ignore-scripts
npx wrangler d1 migrations apply viral-trend-radar-db --local
npx wrangler d1 migrations list viral-trend-radar-db --local
npm run typecheck
npm test
npm run build
npm run licenses
npm audit --audit-level=high
```

## Next audit queue
7. Dependency license policy and failure handling (current PR; awaiting CI and owner merge).
8. Same-origin CORS behavior, real D1 health probe/badge, and targeted formatting.

## Handoff checklist
- Check this file and latest PR status before changes.
- Keep audit items isolated in sequential branches/PRs.
- Wait for CI; do not merge on the user's behalf.
- Do not run remote migrations or deploy production without explicit confirmation.

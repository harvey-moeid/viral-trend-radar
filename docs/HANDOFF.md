# Project Handoff — Viral Trend Radar

Updated: 2026-11-27

## Repository
- GitHub: https://github.com/harvey-moeid/viral-trend-radar
- Production branch: `main`
- Stack: React + TypeScript + Vite, Cloudflare Worker, Cloudflare D1, GitHub Actions.
- Deployment policy: production deployment is manual-only. Never trigger production deployment without explicit owner confirmation.

## Completed audit work
1. Lockfile and deterministic install.
2. Worker authorization regression tests.
3. D1 migration handling with isolated local CI migrations and manual production workflow.
4. Shared authorization helper and constant-time bearer-token comparison.
5. YouTube upstream error handling and rate limiting, merged in PR #8.

## Pending audit PRs
- Point 6 — PWA manifest icons and app-shell cache hardening: PR #9 (open; merge first).
- Point 7 — dependency license policy and CI failure handling: PR #10 (open; stacked on PR #9).
- Point 8 — same-origin CORS behavior, real D1 health probe/badge, and focused formatting: current branch `audit/same-origin-health-check`; PR pending and stacked on point 7.

## Known architecture and constraints
- D1 binding: `VTR_DB`; database: `viral-trend-radar-db`.
- Worker secrets: `APP_API_TOKEN`; optional `YOUTUBE_API_KEY`.
- YouTube Data API remains discovery-only: results are ephemeral and are not stored or historically tracked.
- TikTok research is manual entry only. No scraping, private endpoints, cookies, browser automation, or video downloading.
- Remote D1 migrations are versioned under `migrations/`. Add a new sequential SQL file for schema changes; do not edit an already-applied migration.
- Production deploy workflow: GitHub Actions `Deploy Cloudflare Worker`, manual `workflow_dispatch` on `main`, with the production environment gate.
- The Worker API is same-origin only; it does not emit CORS allow headers.
- `/api/health` probes D1 using `SELECT 1` and distinguishes connected, unavailable, and unconfigured states.

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
- Merge PRs #9, #10, and #11 in order after their CI checks pass.
- Revisit any license exception when its package version or license expression changes.
- Do not run remote migrations or deploy production without explicit confirmation.

## Handoff checklist
- Check this file and latest PR status before changes.
- Keep audit items isolated in sequential branches/PRs.
- Wait for CI; do not merge on the user's behalf.
- Do not run remote migrations or deploy production without explicit confirmation.

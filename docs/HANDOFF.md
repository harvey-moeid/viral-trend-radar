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
4. Shared authorization helper and constant-time bearer-token comparison: protected API routes share one `authorize` helper; tokens are compared as fixed-size SHA-256 digests without early-exit byte comparison; auth regression coverage expanded.

Merged pull requests:
- PR #4 — https://github.com/harvey-moeid/viral-trend-radar/pull/4
- PR #5 — https://github.com/harvey-moeid/viral-trend-radar/pull/5
- PR #6 — https://github.com/harvey-moeid/viral-trend-radar/pull/6 (audit point 4)

## Current change in progress
- Audit point 5: YouTube upstream error handling (including non-JSON responses) and rate limiting. Tracked in its own branch and PR.
- No production database writes, migrations, or deployment are part of this change.

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
5. YouTube upstream error handling (including non-JSON responses) and rate limiting (in progress).
6. PWA manifest icons.
7. License-audit policy and failure handling.
8. Minor CORS behavior, D1 health badge, and formatting.

## Handoff checklist for the next session
- Check this file and the latest PR status before making changes.
- Start from latest `main` after the previous PR is merged.
- Keep each audit item isolated in its own branch and PR.
- Wait for CI to pass; do not merge on the user's behalf.
- Do not run remote migrations or deploy production without explicit confirmation.

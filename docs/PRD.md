# Product requirements
Personal Android-first content research workspace for YouTube discovery and manual TikTok research in Indonesia and global markets.

## Compliance boundaries
YouTube Data API v3 is discovery-only. Search results are transient and are not persisted, scored, historically tracked, or aggregated across channels. TikTok accepts manual URL and visible metrics only. No scraping, private endpoints, cookies, browser automation, unofficial APIs, or downloads. Unknown metrics remain null.

## Functional requirements
- VTR-01 Responsive mobile-first dashboard.
- VTR-02 Official YouTube Data API search with transient results.
- VTR-03 Manual TikTok observation records in D1.
- VTR-04 Server-side validation and write authorization.
- VTR-05 Honest health and configuration states.
- VTR-06 No YouTube score/history/creator cross-channel aggregate.
- VTR-07 CI typecheck, tests, build, dependency audit.
- VTR-08 Manual-only protected deployment.

## Exclusions
Scraping, video downloading, auto-publishing, account automation, paid APIs/AI, automated collection, and derived YouTube analytics.

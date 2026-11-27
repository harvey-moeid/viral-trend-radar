# Security controls and known gaps

- API keys and APP_API_TOKEN are runtime secrets only; never commit .dev.vars.
- Manual write endpoint requires Bearer token and server-side schema validation.
- SQL uses parameterized statements and D1 constraints.
- YouTube search responses are no-store and never written to D1.
- API endpoints are same-origin only. Worker responses do not emit CORS allow-origin/method/header permissions; cross-origin browser requests are not enabled.
- The public health endpoint performs a lightweight `SELECT 1` D1 probe and reports configured, connected, or unavailable status without exposing secrets or database contents.
- GitHub Actions use read-only repository permissions and manual production dispatch.
- Public use requires Cloudflare Access or equivalent identity protection. Shared bearer token is temporary single-owner protection, not full account authentication.
- Keep YouTube scoring, cross-channel aggregation and historical analytics disabled pending compliance clearance.

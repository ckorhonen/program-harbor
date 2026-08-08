# Local verification receipt

Date source: workspace current date, `2026-08-08 America/New_York`.

| Check | Result |
|---|---|
| `bun run test` | 4 files, 18 tests passed |
| `bun run typecheck` | Passed |
| `bun run lint` | Passed |
| `bun run build` | Passed; Next.js 16.3.0 production build |
| `bun run test:e2e` | 4 passed, 2 intentional mobile skips; mobile project is Chromium at 390px |
| `bun run audit:dom` | Passed on 9 routes; no missing alt, unnamed controls, duplicate IDs, overflow, or console errors |
| `bun run measure:local` | 3 warm Chromium samples per route; indicative local timing only |
| `bunx --bun @redocly/cli lint openapi.yaml` | Passed with no validation warnings |
| Demo reset/seed | Seed counts restored: 12 submissions, 10 speakers, 8 sessions; reset response matches state view |
| Process restart | Event edit survived a production process restart and was then reset |
| Default-off guard | Admin state, reset, calendar, and private API reads returned 403 with `PROGRAM_HARBOR_DEMO_MODE=false` |
| Public privacy | Public state omitted speaker email and demo-only event fields; evaluator/speaker projections were scoped |
| Visual review | Launchpad, admin, CFP, mobile schedule, mobile portal, and API docs screenshots inspected |

External provider credentials and deployment readback were not available, so the release remains blocked for public deployment and production claims.

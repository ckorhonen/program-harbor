# Verification report

## Verdict

The supplied packet supports the listed local checks plus a deployed demo verification. It does not support live third-party integrations, accessibility certification, load performance, or a production-authentication claim.

## Evidence receipt

| Check | Exact command | Result | Scope |
| --- | --- | --- | --- |
| Unit tests | `bun run test` | 4 unit-test files; 18 tests passed | Local |
| Typecheck | `bun run typecheck` | Passed | Local |
| Browser E2E | `bun run test:e2e` | 4 passed, 2 intentional mobile skips | Local Chromium; mobile project uses 390px Chromium |
| Lint | `bun run lint` | Passed | Local source tree; generated artifacts ignored |
| Production build | `bun run build` | Passed | Local Next.js production build |
| DOM/accessibility smoke | `bun run audit:dom` | Passed on 9 routes | Local Chromium; bounded structural smoke only |
| Local timing sample | `bun run measure:local` | Completed, 3 warm samples per route | Local Chromium; not a deployment benchmark |
| OpenAPI lint | `bunx --bun @redocly/cli lint openapi.yaml` | Passed with no validation warnings | OpenAPI 3.1 document |
| OpenNext/Cloudflare deploy | `bun run deploy` | Passed; Worker version `f5ea2b9c-178b-4198-ad73-d8e7d584e5ce` | Cloudflare Worker, source commit `0d16cc0` |
| Live route smoke | HTTP readback against `https://program-harbor.sourcebottle.workers.dev` | Passed for public/private demo routes, API health, and `/openapi.yaml` | Deployed demo; `PROGRAM_HARBOR_DEMO_MODE=true` |
| Live D1 persistence | Reset, event update/readback, idempotent submission replay, final reset | Passed; seeded state restored to 12 submissions and 10 speakers | Remote D1 `program-harbor` |
| Walkthrough video | `bun run record:walkthrough` | Passed; 36.96-second 1440×900 WebM inspected at multiple timestamps | Deployed demo |

The packet also identifies the runtime as Next.js 16.3.0 with Bun 1.2.3 and the local persistence target as `.data/program-harbor.json`.

## What this verifies

The recorded results support the narrow claim that the local unit, typecheck, lint, build, browser, DOM, and timing checks passed at the stated scope, and that the deployed demo returned the recorded route, health, D1 persistence, and reset results. The deployed demo flag is intentionally enabled; `.env.example` remains `PROGRAM_HARBOR_DEMO_MODE=false` for production-shaped configuration.

## What remains blocked or unverified

| Area | Status | Limitation |
| --- | --- | --- |
| Build and deployment | PASSING for demo | OpenNext Worker deployment, public URL, version readback, health, route smoke, D1 persistence, and reset passed; production auth is not enabled. |
| Email, Airtable, Accelevents, R2 | BLOCKED | No live credentials or provider readback. |
| Accessibility certification | UNVERIFIED | The bounded DOM smoke passed, but no WCAG audit, keyboard-only session, or assistive-technology result was run. |
| Performance deployment claim | PARTIAL | Local warm timing samples and a bounded live route smoke exist, but no representative load test exists. |

Passing functional checks must not be reused as evidence for the blocked or unverified areas.

# Verification report

## Verdict

The supplied packet supports a local verification result for the listed checks. It does not support a deployment, integration, accessibility, performance, or production-release claim.

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

The packet also identifies the runtime as Next.js 16.3.0 with Bun 1.2.3 and the local persistence target as `.data/program-harbor.json`.

## What this verifies

The recorded results support the narrow claim that the local unit, typecheck, lint, build, browser, DOM, and timing checks passed at the stated scope. The demo flag is enabled by the development script, while `.env.example` sets `PROGRAM_HARBOR_DEMO_MODE=false`.

## What remains blocked or unverified

| Area | Status | Limitation |
| --- | --- | --- |
| Build and deployment | BLOCKED | Local build passed, but no deployable Wrangler entry point, public URL, deployment readback, or post-deploy smoke result exists. |
| Email, Airtable, Accelevents, R2 | BLOCKED | No live credentials or provider readback. |
| Accessibility certification | UNVERIFIED | The bounded DOM smoke passed, but no WCAG audit, keyboard-only session, or assistive-technology result was run. |
| Performance deployment claim | BLOCKED | Local warm timing samples exist, but no deployment benchmark or representative load test exists. |

Passing functional checks must not be reused as evidence for the blocked or unverified areas.

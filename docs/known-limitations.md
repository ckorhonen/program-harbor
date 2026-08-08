# Known limitations

The following table is the current evidence boundary for the competition entry.

| Area | Current status | Limitation and consequence |
| --- | --- | --- |
| Evidence scope | Local + deployed demo | The packet includes a live Cloudflare Worker/D1 demo readback, but it does not establish production security or provider readiness. |
| Persistence | D1 in deployed demo; JSON locally | The live Worker persists the demo state in D1; local development continues to use `.data/program-harbor.json`. |
| Demo mode | Deployed demo | `PROGRAM_HARBOR_DEMO_MODE=true` is intentionally enabled on the public demo; demo access is not production-auth evidence. |
| Tests | Local recorded | 4 unit-test files/18 tests, typecheck, lint, build, DOM smoke, and 4 browser tests passed; 2 mobile organizer tests are intentionally skipped because mobile coverage targets public surfaces. |
| Deployment | PARTIAL / live demo | The Worker is live at `https://program-harbor.sourcebottle.workers.dev` on version `f5ea2b9c-178b-4198-ad73-d8e7d584e5ce`; real authenticated operations are not enabled. |
| Email | BLOCKED | No email credentials, allowlisted recipient result, or delivery receipt was supplied. |
| Airtable | BLOCKED | No base credentials or live readback was supplied. |
| Accelevents | BLOCKED | No target credentials or sync readback was supplied. |
| R2/object storage | BLOCKED | No bucket credentials or object readback was supplied. |
| Accessibility | PARTIAL | The bounded DOM smoke passed; no WCAG or assistive-technology sign-off exists. |
| Performance | PARTIAL | Warm local navigation samples and a live route smoke exist; no representative load benchmark exists. |
| Authentication | BLOCKED for production | Demo mode is environment-gated but remains intentionally unauthenticated; production auth/session enforcement is not implemented in this local entry. |
| File storage | PARTIAL | Submission and speaker file records persist validated metadata; file bytes are not stored or downloadable in this build. |
| Rate limiting | PARTIAL | Local submission throttling is bounded and avoids caller-supplied IP headers; a production edge limiter is still required for distributed abuse protection. |

These limitations are deliberate claim boundaries. A local emulator, local file adapter, functional test pass, or design document must not be presented as proof of the corresponding external or release capability.

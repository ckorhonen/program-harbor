# Known limitations

The following table is the current evidence boundary for the competition entry.

| Area | Current status | Limitation and consequence |
| --- | --- | --- |
| Evidence scope | Local only | The packet verifies local behavior only; it does not establish a public release. |
| Persistence | Local JSON | The observed target is `.data/program-harbor.json`; no production persistence readback exists. |
| Demo mode | Local demo | The dev script enables `PROGRAM_HARBOR_DEMO_MODE=true`, while `.env.example` is `false`; demo access is not production-auth evidence. |
| Tests | Local recorded | 4 unit-test files/18 tests, typecheck, lint, build, DOM smoke, and 4 browser tests passed; 2 mobile organizer tests are intentionally skipped because mobile coverage targets public surfaces. |
| Deployment | BLOCKED | No deployable Wrangler entry point, public URL, build identifier, or post-deploy readback exists for this Node/file-backed build. |
| Email | BLOCKED | No email credentials, allowlisted recipient result, or delivery receipt was supplied. |
| Airtable | BLOCKED | No base credentials or live readback was supplied. |
| Accelevents | BLOCKED | No target credentials or sync readback was supplied. |
| R2/object storage | BLOCKED | No bucket credentials or object readback was supplied. |
| Accessibility | PARTIAL | The bounded DOM smoke passed; no WCAG or assistive-technology sign-off exists. |
| Performance | PARTIAL | Warm local navigation samples are recorded; no deployment or load benchmark exists. |
| Authentication | BLOCKED for production | Demo mode is environment-gated but remains intentionally unauthenticated; production auth/session enforcement is not implemented in this local entry. |
| File storage | PARTIAL | Submission and speaker file records persist validated metadata; file bytes are not stored or downloadable in this build. |
| Rate limiting | PARTIAL | Local submission throttling is bounded and avoids caller-supplied IP headers; a production edge limiter is still required for distributed abuse protection. |

These limitations are deliberate claim boundaries. A local emulator, local file adapter, functional test pass, or design document must not be presented as proof of the corresponding external or release capability.

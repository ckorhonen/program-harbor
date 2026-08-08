# Security review

## Review result

`PARTIAL` for the deployed demo and `BLOCKED` for production release. The review found and fixed concrete validation, projection, ownership, persistence-permission, schedule-override, and header issues. The remaining demo authentication, file-byte, and provider gaps are release blockers.

## Evidence and design boundary

| Control area | Evidence | Review status |
| --- | --- | --- |
| Runtime and store | Next.js 16.3.0, Bun 1.2.3, OpenNext Worker, D1 in deployment; JSON target `.data/program-harbor.json` locally | Deployed demo readback; local file adapter remains development-only |
| Demo-mode boundary | Dev script sets `PROGRAM_HARBOR_DEMO_MODE=true`; `.env.example` sets `false` | Configuration observed; production auth unverified |
| Functional checks | 4 unit-test files/18 tests passed; typecheck passed; Chromium E2E 3/3 passed | Functional evidence only |
| Authorization and privacy | Public, evaluator, and speaker projections are allowlisted; speaker task/profile/file routes are scoped to `speaker-01`; default-off guard was exercised | Demo mode still has no real authenticated principal |
| Input and output safety | Submission lengths/idempotency/conditional answers, review rubric ranges, schedule override reasons, file metadata limits, and malformed/oversized JSON paths are checked server-side | Full schema coverage and adversarial fuzzing remain incomplete |
| Secrets and external providers | No live credentials or provider readback | BLOCKED |
| Deployment | `https://program-harbor.sourcebottle.workers.dev`, Worker version `f5ea2b9c-178b-4198-ad73-d8e7d584e5ce`, D1 health and route/persistence smoke passed | Demo verified; production auth blocked |

## Local adversarial receipt

The following checks were run against the local production server with `PROGRAM_HARBOR_DEMO_MODE=true` unless noted otherwise:

- Public state omitted speaker email and `demoMode`; evaluator state returned only assigned submissions and redacted speaker email; speaker state returned only the current speaker.
- Replaying one submission idempotency key returned the same submission ID without creating another proposal, and a direct hidden Workshop answer on a Talk submission was dropped before persistence.
- Invalid review criterion/range input returned `422`; task completion without the scoped speaker identity and private file metadata without an owner returned `403`.
- A conflicting schedule placement returned `409`; an override required a non-empty reason, persisted on the canonical schedule entry, and survived an unrelated later schedule mutation.
- With the production-shaped server started using `PROGRAM_HARBOR_DEMO_MODE=false`, admin state, reset, calendar, and private API reads returned `403`.
- The local state directory and JSON file were reset to `0700` and `0600`; security response headers include `nosniff`, strict referrer policy, same-origin framing, and a restrictive permissions policy.

The existing architecture security document is a design reference. Its stated controls must be tested against the actual running application before being called verified, including direct unauthorized requests, role boundaries, file access, traversal, HTML/embed handling, rate limits, CSRF behavior, and secret redaction.

## Required closeout evidence

- Deployed target: Cloudflare Worker URL and version above, built from `0d16cc0`.
- External boundary: D1 state persistence is live; email, Airtable, Accelevents, R2, and file bytes have no live credentials or readback.
- Authentication boundary: the public demo uses the explicit unauthenticated demo flag and must not be treated as a production principal.

## Residual blockers

- `PROGRAM_HARBOR_DEMO_MODE=true` is an intentionally unauthenticated superuser boundary for the dedicated local/demo environment; a production deployment needs real sessions or signed role-scoped tokens before any private mutation is exposed.
- File handling persists private metadata pointers only; it does not store or serve bytes, so R2/private object-storage behavior remains `BLOCKED`.
- The local file adapter is process-local JSON, while the deployed demo uses D1 for the state document; file bytes are still metadata-only and R2 is unconfigured.
- No live email, Airtable, Accelevents, or R2 readback exists; the deployed Cloudflare endpoint and D1 readback are recorded above.

Before changing this review to release-ready, record the exact authentication principal, security test commands/results, environment boundary, and readback for every external operation. Keep provider and production-auth claims `BLOCKED` until credentials and readback exist.

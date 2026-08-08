# Security review

## Review result

`PARTIAL` for the local demo and `BLOCKED` for production release. The local review found and fixed several concrete validation, projection, ownership, persistence-permission, schedule-override, and header issues. The remaining demo authentication and provider/deployment gaps are release blockers.

## Evidence and design boundary

| Control area | Local evidence | Review status |
| --- | --- | --- |
| Runtime and local store | Next.js 16.3.0, Bun 1.2.3, JSON target `.data/program-harbor.json` | Local context only |
| Demo-mode boundary | Dev script sets `PROGRAM_HARBOR_DEMO_MODE=true`; `.env.example` sets `false` | Configuration observed; production auth unverified |
| Functional checks | 4 unit-test files/18 tests passed; typecheck passed; Chromium E2E 3/3 passed | Functional evidence only |
| Authorization and privacy | Public, evaluator, and speaker projections are allowlisted; speaker task/profile/file routes are scoped to `speaker-01`; default-off guard was exercised | Demo mode still has no real authenticated principal |
| Input and output safety | Submission lengths/idempotency/conditional answers, review rubric ranges, schedule override reasons, file metadata limits, and malformed/oversized JSON paths are checked server-side | Full schema coverage and adversarial fuzzing remain incomplete |
| Secrets and external providers | No live credentials or provider readback | BLOCKED |
| Deployment | No URL, build readback, or post-deploy smoke result | BLOCKED |

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

## Residual blockers

- `PROGRAM_HARBOR_DEMO_MODE=true` is an intentionally unauthenticated superuser boundary for the dedicated local/demo environment; a production deployment needs real sessions or signed role-scoped tokens before any private mutation is exposed.
- File handling persists private metadata pointers only; it does not store or serve bytes, so R2/private object-storage behavior remains `BLOCKED`.
- The file adapter is process-local JSON and is not a multi-instance production store; configured Airtable/D1/R2 modes are not implemented and health reports unsupported modes as degraded.
- No live email, Airtable, Accelevents, R2, Cloudflare, or deployed endpoint readback exists.

Before changing this review to release-ready, record the exact deployed target, authentication principal, security test commands/results, environment boundary, and readback for every external operation. Keep provider and deployment claims `BLOCKED` until credentials and readback exist.

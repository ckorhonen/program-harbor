# Security

## Review status

Security release sign-off is `BLOCKED` for this competition entry. The available packet contains local application and test evidence only; it contains no deployment readback, provider credentials, external integration result, or production security assessment.

## Local security boundary

The local configuration uses file-backed persistence at `.data/program-harbor.json`. The development script enables `PROGRAM_HARBOR_DEMO_MODE=true`, while `.env.example` sets the sample value to `false`. Demo-mode behavior must not be treated as proof of production authentication or authorization.

The repository's security model documents the following controls as design expectations:

- server-side authorization and event scoping for consequential mutations;
- schema validation before domain operations, including server-side conditional-field handling;
- idempotency, rate limits, and bounded request and file sizes for public submission paths;
- expiring, speaker-scoped portal access that fails closed for invalid links;
- private-file authorization, sanitized HTML, and allowlisted sandboxed embeds;
- server-only provider secrets with redacted logs; and
- audit records for status changes, schedule overrides, sends, resets, and sync operations.

Those design statements are not a substitute for a security test receipt. The supplied evidence reports 18 passing unit tests, a passing typecheck, and 3/3 passing Chromium E2E tests, but it does not report dedicated authorization, file, injection, CSRF, rate-limit, dependency, or secret-redaction checks.

## External systems

Email, Airtable, Accelevents, and R2 are `BLOCKED` because no live provider credentials or post-operation readback were supplied. Cloudflare deployment is also `BLOCKED`: the authenticated account has no deployable Wrangler entry point for this Node/file-backed build, and no post-deploy readback exists. A local emulator or local file adapter must never be described as proof of a live provider integration.

## Reporting a vulnerability

Do not disclose credentials or exploit details in a public issue. Provide a minimal reproduction, affected route or document, local-versus-external scope, and the exact evidence available. If a report requires a live provider or deployment to reproduce, identify that missing authorization or readback instead of attempting an external mutation.

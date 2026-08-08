# Security model

- **Authorization:** every server mutation checks the authenticated role and event scope; demo role switching requires an explicit server-side demo flag and is unavailable when it is false.
- **Input validation:** route payloads are parsed with schemas before domain functions run. Conditional form rules are evaluated on the server, and hidden answers are dropped rather than trusted.
- **Public abuse controls:** CFP submission and portal-link issuance use idempotency keys, rate limits, bounded body/file sizes, and safe generic errors.
- **Portal access:** links/sessions are expiring, scoped to one speaker, and never accepted as a speaker ID supplied by the client. Invalid links fail closed.
- **Files:** MIME/extension and size are validated; private files require an authorized signed or server-mediated download. Headshots are separately publishable.
- **HTML and embeds:** rich text is sanitized; embed URLs are allowlisted and sandboxed without unrestricted parent access.
- **Secrets:** provider tokens are server-only, read from environment/secret storage, redacted from logs, and never written to seed data or client bundles.
- **Audit:** status transitions, schedule changes, overrides, sends, resets, and sync operations produce actor, timestamp, event, operation ID, and outcome records.

The security review must still include dependency scanning, public/private response tests, direct unauthorized URL checks, file traversal checks, and rendered HTML inspection before any release claim.

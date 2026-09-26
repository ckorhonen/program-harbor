<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Program Harbor workflow

Program Harbor is a Cloudflare Worker/D1 demo for conference program operations.
The local app uses the ignored `.data/program-harbor.json` snapshot; deployed
behavior is a demo with `PROGRAM_HARBOR_DEMO_MODE=true`, not authenticated
production provider integration. Do not represent Airtable, Accelevents, email,
R2, or file-byte storage as live until their resource-specific evidence exists.

Use Bun 1.2.3. Install the locked dependency set with `bun install --frozen-lockfile`.
`bun run dev` enables local demo mode; use the explicit `bun run seed` or
`bun run reset-demo` helpers to change demo state. Do not run deployment or a
live monitor merely to validate a local instruction or code change.

`app/` holds the Next.js UI and API surface, `src/lib/` holds domain/storage
logic, `migrations/` holds D1 schema, `tests/unit/` covers local behavior, and
`tests/e2e/` covers browser journeys. For a code change, run its focused test,
then `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build`.
Run `bun run test:e2e` for a user flow and `bun run preview` for the OpenNext
boundary. A complete change also passes `git diff --check`.

Preserve redacted public/speaker projections, deterministic seed/reset behavior,
idempotency, and schedule-conflict audit overrides. For a deployed demo change,
read `docs/deployment.md`, `docs/known-limitations.md`, and the latest evidence
receipt, then verify the intended deployed route and record only observed
behavior.

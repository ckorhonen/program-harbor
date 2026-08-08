# Deployment

## Local

```bash
bun install
bun run dev
```

The local adapter persists to `.data/program-harbor.json`. Submission and speaker file records currently persist private metadata only; file bytes are not stored or downloadable in this build. Run `bun run seed` or use the demo reset action to restore the named seed event. Never commit `.data` or `.env`.

## Production shape

The deployed target is a Cloudflare Worker built by OpenNext. The Worker uses a D1 binding for the whole demo state document, so it does not depend on the ephemeral Worker filesystem. `wrangler.jsonc` owns the Worker, assets, D1 binding, migration directory, and environment variables; `bun run deploy` builds and deploys the same target.

### Live deployment receipt — 2026-08-08

- URL: https://program-harbor.sourcebottle.workers.dev
- Worker version: `f5ea2b9c-178b-4198-ad73-d8e7d584e5ce`
- Source commit deployed: `0d16cc0`
- D1 database: `program-harbor` (`461f96dc-bbf5-4791-8abc-85bcd327bf0d`), migration `0001_program_state.sql` applied remotely
- Live health: `200`, storage mode `d1`
- Remote state readback after reset: seeded state, revision `1`, 35,521 bytes, served from ENAM/EWR
- Route smoke: public launchpad, CFP, admin, evaluator, portal, schedule, speakers, API docs, `/api/v1/health`, and `/openapi.yaml` returned successfully
- Persistence smoke: event update survived a second read, a public submission replay returned the same idempotent submission, and reset restored 12 submissions/10 speakers

This is an intentionally unauthenticated demo deployment with `PROGRAM_HARBOR_DEMO_MODE=true`; it is suitable for review and walkthroughs, not for real private event operations. Email, Airtable, Accelevents, R2/file bytes, and production authentication remain unconfigured.

Required environment values are documented in `.env.example`; values are never printed. A release must record the commit/build identifier, adapter mode, health response, seed/reset result, and public/private route smoke results.

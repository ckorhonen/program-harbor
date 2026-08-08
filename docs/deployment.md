# Deployment

## Local

```bash
bun install
bun run dev
```

The local adapter persists to `.data/program-harbor.json`. Submission and speaker file records currently persist private metadata only; file bytes are not stored or downloadable in this build. Run `bun run seed` or use the demo reset action to restore the named seed event. Never commit `.data` or `.env`.

## Production shape

The app is built with `bun run build` and can run on a Node-compatible host. Cloudflare is the preferred competition target, but a Pages/Workers deployment must use a production storage adapter (D1, Durable Object, Airtable, or another explicitly configured store) rather than relying on an ephemeral filesystem. Wrangler/account configuration and a post-deploy smoke test are required before claiming a public deployment.

The final preflight ran `wrangler deploy --dry-run` with the authenticated Cloudflare account; it failed before mutation because this repository has no Wrangler entry point or configuration. No Pages project was created and no deployment URL exists. A future deployment also needs a production storage adapter because the current runtime uses the local JSON file adapter.

Required environment values are documented in `.env.example`; values are never printed. A release must record the commit/build identifier, adapter mode, health response, seed/reset result, and public/private route smoke results.

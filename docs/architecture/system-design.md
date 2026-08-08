# System design

Program Harbor uses a Next.js App Router application with TypeScript. Server route handlers own authorization, validation, domain mutations, and public/private serialization; client components own interaction state and call the same API used by browser tests.

```text
Browser surfaces
  ├─ Admin / evaluator / portal / public React components
  └─ Playwright browser tests
        │ HTTPS JSON, multipart, ICS
Next route handlers
  ├─ auth + demo-mode policy
  ├─ zod request validation
  ├─ domain services (routing, reviews, tasks, conflicts, templates)
  └─ public/private serializers
StorageAdapter
  ├─ deterministic file adapter (local/demo/test)
  ├─ Airtable adapter (credential-gated)
  └─ future D1/production adapter boundary
ObjectStoreAdapter
  └─ private local object store / R2-compatible boundary
JobAdapter
  └─ durable local scheduler / Cloudflare Workflow or Queue boundary
```

The first deployable slice uses the file adapter because it is deterministic and inspectable in this empty repository. The adapter contract keeps domain logic independent from JSON or Airtable record shapes. A production adapter must provide atomic writes or optimistic concurrency; the demo reset is namespace-scoped and never deletes unrelated resources.

## Runtime boundaries

- `src/lib/domain` contains pure functions and domain types.
- `src/lib/storage` contains adapter contracts and implementations.
- `src/lib/integrations` contains provider clients, dry-runs, and redacted operation logs.
- `src/lib/seed` owns only the named demo namespace.
- `app/api` is a thin HTTP boundary; it must not duplicate domain rules.
- `app/*` contains route composition and accessible UI components.

## Failure behavior

Every consequential mutation returns an operation ID and a user-readable outcome. Validation errors are field-associated; authorization failures return the same safe shape regardless of whether a record exists; external failures preserve local state and expose retry metadata. Public endpoints serialize only approved fields.

# Contributing

Contributions should keep the project easy to run locally and should preserve the distinction between local evidence and external release evidence.

## Local workflow

Use Bun 1.2.3 and run the checks from the repository root:

```bash
bun install
bun run test
bun run typecheck
bun run test:e2e
bun run lint
```

The current evidence packet records 4 unit-test files with 18 tests passed, a passing typecheck, and Chromium E2E at 3/3 passed. Lint is pending a rerun after the generated-artifact ignore; contributors must record the actual result rather than inferring it from another check.

For a local demo, start with:

```bash
bun run dev
```

Use `bun run seed` or `bun run reset-demo` when local demo data needs to be restored. These commands operate on the local file-backed store at `.data/program-harbor.json`; do not commit `.data/` or `.env` files.

## Scope and evidence

- Reuse the existing product, architecture, and competition documents before introducing new terminology.
- Keep official competition-brief claims separate from the supplied execution contract; [the submission package](docs/competition/submission-package.md) is the reference for that boundary.
- Describe test results with their exact scope. A local test pass does not establish deployment, provider compatibility, email delivery, or production security.
- Do not add credentials, tokens, private data, fabricated URLs, or invented performance metrics to code, documentation, logs, or screenshots.
- Do not run external integrations or mutate external systems as part of a local contribution. Missing credentials and missing readback remain `BLOCKED`.

## Documentation changes

When behavior or operational assumptions change, update the relevant README, runbook, report, or limitation entry in the same change. If a check was not run, say `UNVERIFIED` or `BLOCKED` and name the missing evidence.

## Review checklist

Before handing off a change:

- confirm the changed files are in scope;
- run the narrowest relevant local checks;
- preserve unrelated work in the shared workspace;
- report exact commands and results;
- call out remaining risks, missing credentials, and unverified release gates.

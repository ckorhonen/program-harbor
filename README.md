# Program Harbor

Program Harbor is an open-source program-operations desk for conference teams. This repository is a local competition entry: the evidence recorded here distinguishes verified local behavior from unverified deployment and provider behavior.

Repository: [github.com/ckorhonen/program-harbor](https://github.com/ckorhonen/program-harbor)

## Evidence status

The local verification receipt records a Next.js 16.3.0 app running with Bun 1.2.3, file-backed local JSON persistence at `.data/program-harbor.json`, four unit-test files with 18 tests passed, typecheck, lint, and production build passing. The browser suite passes 4 tests with 2 intentional mobile skips; the mobile project runs Chromium at a 390px viewport because the installed WebKit binary is unavailable.

Deployment and external integration evidence are `BLOCKED`: no public deployment readback, live email/Airtable/Accelevents/R2 credentials, provider proof, or post-deploy smoke result was supplied. The Cloudflare account is authenticated, but this repository has no deployable Wrangler entry point or production storage adapter, so no deployment mutation was made; the authorized GitHub repository publication is tracked separately.

## Quick start

Prerequisite: Bun 1.2.3.

```bash
bun install
bun run dev
```

Open the local app at `http://localhost:3000`. The `dev` script enables `PROGRAM_HARBOR_DEMO_MODE=true`; `.env.example` keeps the sample default at `false`, so demo configuration is not silently treated as a production configuration.

To restore local demo data, use one of the explicit local helpers:

```bash
bun run seed
bun run reset-demo
```

The local persistence target is `.data/program-harbor.json`. The `.data/` directory is ignored and must not be committed.

## Verification commands

Run the repository checks from the project root:

```bash
bun run test
bun run typecheck
bun run test:e2e
bun run lint
bun run audit:dom
bun run measure:local
```

The verification reports record the exact local results. `audit:dom` is a bounded DOM/keyboard-surface smoke, not a WCAG or assistive-technology certification. `measure:local` reports warm local Chromium navigation timing and is not a deployment benchmark.

## Configuration

Copy `.env.example` only when local configuration is needed. It documents file storage, `.data` as the data directory, and `http://localhost:3000` as the local public URL. Optional Airtable, R2, email, Accelevents, and Cloudflare variables are placeholders; absent credentials and provider readback keep those integrations `BLOCKED`.

Never put credentials in source files, `.env.example`, seed data, screenshots, logs, or issue reports.

## Documentation map

- [Demo runbook](docs/demo-runbook.md) — bounded local setup and repeatable walkthrough.
- [Submission package](docs/competition/submission-package.md) — official brief claims, supplied execution contract, and evidence boundaries.
- [Cost log](docs/competition/cost-log.md) — recorded spend evidence and missing cost data.
- [Verification report](docs/verification-report.md) — local test and typecheck receipt.
- [Accessibility report](docs/accessibility-report.md) — accessibility evidence status.
- [Performance report](docs/performance-report.md) — performance evidence status without invented metrics.
- [Security review](docs/security-review.md) — documented controls and release blockers.
- [Known limitations](docs/known-limitations.md) — concise current limitations table.
- [Competition source log](docs/competition/source-log.md) — source links and currentness notes.
- [Requirements matrix](docs/competition/requirements-matrix.md) — brief-versus-contract reconciliation.

## License

Program Harbor is licensed under the [MIT License](LICENSE).

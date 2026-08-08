# Competition submission package

## Submission posture

This package is an evidence receipt for the local Program Harbor entry. It does not claim a public deployment, a competition-form submission, or compatibility with a live provider. The source links for the official materials are already recorded in [the competition source log](source-log.md).

## Official competition brief

The source log records the brief's request for the program/submission workflow: event configuration, submission forms, speaker-facing work, evaluation, agenda/program operations, communications, and public program surfaces. It records the first six capabilities as firm and Accelevents, resources/embeds, and embeddable gallery/schedule as optional or bonus in the rendered brief. Cloudflare, Airtable persistence, speed, an API, and Forge are recorded as bonus preferences.

These are claims about the official brief. They are not evidence that this local checkout has completed every capability.

## Supplied execution contract

The supplied contract expands the implementation and evidence scope beyond the brief. The local requirements matrix records the contract's event configuration, form builder, routing, public submission, submission management, evaluation, speaker portal, tasks, dashboard, communications, reminders, calendar, agenda, conflict handling, optional public/resources surfaces, provider adapters, API, seeded demo, storage, security, quality, and release gates.

The execution contract is the operative acceptance scope for this entry. It must remain labeled as supplied execution scope rather than being presented as language from the competition brief.

## Evidence receipt

| Area | Recorded local evidence | Status |
| --- | --- | --- |
| Runtime | Next.js 16.3.0 app; Bun 1.2.3 | VERIFIED LOCALLY |
| Persistence | File-backed JSON target `.data/program-harbor.json` | VERIFIED LOCALLY |
| Demo configuration | `PROGRAM_HARBOR_DEMO_MODE=true` in the dev script; `false` in `.env.example` | VERIFIED LOCALLY |
| Unit tests | 4 unit-test files; 18 tests passed | VERIFIED LOCALLY |
| Typecheck | Typecheck passed | VERIFIED LOCALLY |
| Browser E2E | 4 passed, 2 intentional mobile skips; mobile project uses Chromium at 390px | VERIFIED LOCALLY |
| Lint/build | `bun run lint` and `bun run build` passed | VERIFIED LOCALLY |
| DOM/timing | `bun run audit:dom` passed; `bun run measure:local` recorded warm samples | PARTIAL LOCAL EVIDENCE |
| Repository | [github.com/ckorhonen/program-harbor](https://github.com/ckorhonen/program-harbor), public `main` at commit `7d06ab3` | VERIFIED REMOTELY |
| Deployment | No deployment URL or post-deploy readback | BLOCKED |
| External providers | No credentials or readback for email, Airtable, Accelevents, or R2 | BLOCKED |

## Exact local commands

```bash
bun install
bun run dev
bun run test
bun run typecheck
bun run test:e2e
bun run lint
```

These commands were rerun against the final tree. The evidence receipt also records the production build, DOM audit, local timing sample, OpenAPI lint, seed/reset, privacy, guard, and restart checks.

## Package contents

- [README](../../README.md) — setup, configuration, and evidence boundary.
- [Demo runbook](../demo-runbook.md) — local repeatable walkthrough.
- [Verification report](../verification-report.md) — test and typecheck receipt.
- [Accessibility report](../accessibility-report.md) — unverified accessibility areas.
- [Performance report](../performance-report.md) — unverified performance areas without invented metrics.
- [Security review](../security-review.md) — security status and blocked release gates.
- [Cost log](cost-log.md) — spend evidence and missing data.
- [Known limitations](../known-limitations.md) — concise limitation table.
- [Source log](source-log.md) and [requirements matrix](requirements-matrix.md) — source and contract boundaries.

## Claim policy

Only the local evidence in this package may be called verified. Do not add a deployment URL, provider success, email delivery result, R2 object result, performance metric, or accessibility score unless it is observed and recorded with the corresponding readback.

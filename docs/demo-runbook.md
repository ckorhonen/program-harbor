# Local demo runbook

This runbook covers the repeatable local path for the Program Harbor competition entry. It does not establish a public deployment or a live integration.

## Prepare the local app

From the repository root, use Bun 1.2.3:

```bash
bun install
bun run reset-demo
bun run dev
```

Open `http://localhost:3000`. The local data target is `.data/program-harbor.json`; the reset command is a local state change and must not be confused with a production reset.

The `dev` script enables `PROGRAM_HARBOR_DEMO_MODE=true`. The checked-in `.env.example` sets that variable to `false` and documents the non-demo default. Do not use demo mode as evidence for production role enforcement.

## Walkthrough

Use [the product demo journey](product/demo-journey.md) as the navigation script. It covers the documented admin, evaluator, speaker, schedule, communications, calendar, integration dry-run, public gallery, public schedule, API docs, and reset surfaces.

Treat the journey document as a walkthrough target, not as a claim that every step passed in the supplied packet. For each step, record the route, the local result, and whether the result is functional, visual, accessibility, or integration evidence.

When the journey reaches email, Accelevents, Airtable, R2, or another provider, stop at preview, validation, or emulator output unless a separately authorized live target and readback exist. The current entry has no such credentials or readback, so those steps are `BLOCKED`.

## Local verification commands

```bash
bun run test
bun run typecheck
bun run test:e2e
bun run lint
bun run audit:dom
bun run measure:local
```

The current local receipt records 4 unit-test files/18 tests, typecheck, lint, build, DOM smoke, and 4 browser tests passed, with 2 intentional mobile skips. The mobile project uses Chromium at a 390px viewport because the installed WebKit binary is unavailable.

## Reset and handoff

Run this when the local demo state needs to be restored:

```bash
bun run reset-demo
```

Do not include `.data`, `.env`, test-result directories, screenshots, or credentials in a submission package unless the package explicitly requires a redacted artifact. The competition evidence package must state `BLOCKED` for deployment and live integrations.

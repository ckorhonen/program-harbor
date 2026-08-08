# Swarm state

STATE_VERSION: 5
UPDATED: 2026-08-08 America/New_York

## Goal

Ship and package a credible open-source Sessionboard replacement for the 2026 Kill My SaaS competition, using the supplied pasted specification and the competition's current source material.

## Completion contract

### Required deliverables

- A coherent, persistent event-program application in this repository.
- Requirements freeze, product, architecture, security, deployment, verification, and submission documents named by the specification.
- Seeded `AI Engineer Sandbox Summit` demo with resettable Admin, Evaluator, and Speaker access.
- Working P0 workflow from public CFP through review, acceptance, portal, onboarding dashboard, schedule, conflicts, communications, calendar, public gallery, and public schedule.
- P1 integrations and API where credentials and infrastructure permit, with dry-run/emulator disclosures where they do not.
- Published repository and public deployment when the authorized environment and safe credentials are available; live third-party providers remain optional/unconfigured.
- Evidence artifacts and a paste-ready submission package.

### Hard constraints

- Do not submit the competition form, contact organizers, post in Discord, email unapproved recipients, modify existing production events, spend money, or delete unrelated resources.
- Preserve the P0-first priority and real persistence; do not present static, hard-coded, or dead UI as completed behavior.
- External integrations expose status, validation, dry-run, logs, retries, and last-success state.
- Public/private data separation, authorization, safe file access, rate limiting, secret hygiene, audit history, and sanitized embeds are required.
- Only one writer owns a mutable artifact at a time; root owns shared schema/config and final integration.
- Every completion claim needs direct observable evidence.

### Non-goals

- Full Sessionboard parity or enterprise complexity that does not improve the competition workflow.
- Optional P2 work before P0 verification.
- Live Accelevents or Airtable claims without live credentials and direct readback.
- Production-authenticated deployment or paid-service activation without the authorized environment and safe credentials.

### Acceptance checks

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| C1 | Current source requirements are frozen in source log, matrix, and ambiguities docs | PASSING | `docs/competition/source-log.md`, `requirements-matrix.md`, `ambiguities.md`; Google brief export/PDF, full walkthrough captions, rendered screenshots, CFP screenshot, API docs read on 2026-08-08 |
| C2 | Product and architecture docs define a minimal coherent multi-event system | PASSING | `docs/product/*` and `docs/architecture/*` added; adapter, privacy, seed/reset, and canonical schedule decisions recorded |
| C3 | Persistent P0 vertical slice passes locally and in deployed smoke checks | PASSING for demo | Local and Cloudflare D1 edit/submission/idempotency/reset readback passes; production auth remains outside the demo boundary |
| C4 | All P0 workflows are implemented and browser-verified | PARTIAL | Core local browser journeys pass; several scope rows remain partial or emulator-backed |
| C5 | Seed/reset/demo access is deterministic and safe | PASSING | Seed counts, reset, default-off guard, and 0700/0600 local state permissions verified |
| C6 | P1 integrations/API are implemented or accurately blocked with evidence | PARTIAL | OpenAPI/local API and Accelevents emulator pass local checks; live providers blocked |
| C7 | Accessibility, performance, security, cross-browser, and visual checks are recorded | PARTIAL | DOM/timing/visual/security receipts recorded; WebKit/full WCAG/production security unavailable |
| C8 | Repository/deployment/submission package is complete and independently audited | PARTIAL | Public GitHub repository, live Cloudflare Worker/D1 demo, docs, evidence packet, and walkthrough are complete; production auth/providers and competition submission remain open |

## Assumptions

- The empty current directory is the intended project root.
- Existing local credentials may be absent; missing credentials must narrow claims rather than be replaced by fabricated live verification.
- The deadline in the pasted task is the authoritative competition deadline unless a later explicit competition update supersedes it.
- A reliable local/demo deployment is preferable to an unfinished integration-heavy build if time or credentials force a tradeoff, but the tradeoff must be recorded.

## Workstreams

| Task ID | Owner | Status | Dependencies | Output |
|---|---|---|---|---|
| W0-ARCH | Initial architect worker | completed | Pasted task | Source/constraint map, task graph, risks |
| W0-PRIMARY | Initial primary worker | completed | Empty repo, pasted task | Concrete greenfield implementation path and baseline |
| W0-ADV | Initial adversary worker | completed | Source URLs, pasted task | Blockers, counterexamples, verification plan |
| W1-REQ | Root + requirements owner | completed | W0 reports, live sources | Requirements freeze docs |
| W2-DESIGN | Root + product/architecture owner | completed | W1 | Product and architecture docs |
| W3-VERTICAL | Single implementation owner | completed | W2 | Persistent local P0 slice |
| W4-P0 | Disjoint feature owners | completed | W3 | Local P0 workflows and seed demo |
| W5-P1 | Disjoint integration/API owners | partial | P0 passing | OpenAPI, ICS/comms helpers, emulator disclosures; live providers blocked |
| W6-QA | Fresh QA/auditor | completed | Integrated app | Unit/type/lint/build/browser/DOM/perf/security/visual receipts |
| W7-RELEASE | Release owner | completed | QA gates | Public GitHub repository, deployment attempt, packaging |
| W8-AUDIT | Fresh independent auditor | completed | Release artifacts | Security/reliability audit findings reconciled; residual release blockers documented |
| W3-DOMAIN | Domain worker | completed | Package scaffold, design docs | Domain rules, file storage, seed state, unit tests |
| W4-COMMS | Calendar/comms worker | completed | Package scaffold | ICS, template rendering, reminder contracts, unit tests |

## Artifact ownership

- Root coordinator: `.swarm/state.md`, shared schema, root config, integration, final verification.
- Requirements owner: `docs/competition/*` requirements-freeze files.
- Product owner: `docs/product/*`.
- Architecture owner: `docs/architecture/*`, storage/domain/API contracts.
- Feature owners: disjoint source modules assigned after W0 reconciliation.
- QA owner: tests and evidence directories assigned after implementation.
- Release owner: deployment, seed/reset, packaging artifacts after functional gates.

## Decisions

- D1: Treat the empty directory as a greenfield project and preserve a real-persistence vertical slice as the first implementation gate.
- D2: Do not begin broad feature coding until the requirements-freeze artifacts exist, per the supplied competition task.
- D3: Use `Program Harbor` as the working product name after a basic exact web collision check; trademark status is unverified.
- D4: Treat the pasted execution contract as the implementation scope, while preserving the rendered brief's distinction between firm core capabilities and optional/bonus integrations.
- D5: Keep the Next.js App Router choice and adapter boundary; use OpenNext + D1 for the authorized deployed demo while retaining the local JSON adapter for development.
- D6: Local demo mode is explicit in the development script and false in the example production environment; production role-switch and reset routes must reject requests unless the server-side flag is true.
- D7: Keep the local demo environment-gated and disclose that it is unauthenticated; do not present the demo guard as production authorization. Public/evaluator/speaker serializers are allowlisted, while real authenticated principals remain a deployment prerequisite.
- D8: Persist schedule overrides on canonical entries with a required reason so later recalculation retains the decision; file records remain metadata-only until an object-store implementation exists.

## Blockers

- Live email, Airtable, Accelevents, R2, and test-email credentials are unavailable. The authorized Cloudflare Worker/D1 demo is deployed and verified, but it intentionally has no production authentication or file-byte storage.
- The demo guard is an environment boundary, not production authentication; real authenticated principals remain unimplemented.
- The installed Playwright WebKit binary is unavailable; the mobile E2E project uses Chromium at a 390px viewport and WebKit claims remain unverified.

## Next actions

1. Preserve the verified public repository at `github.com/ckorhonen/program-harbor` and its live demo receipt.
2. Hand off the deployed-demo walkthrough and package with exact version, D1, and reset readbacks.
3. Keep production auth, file bytes/R2, and live email/Airtable/Accelevents integrations explicitly blocked until credentials and security review exist.

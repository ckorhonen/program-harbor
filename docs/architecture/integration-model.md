# Integration model

All providers implement the same observable contract:

```ts
type IntegrationStatus = {
  provider: string;
  configured: boolean;
  validated: boolean;
  mode: "live" | "emulator" | "disabled";
  lastSuccessAt?: string;
  retryable: boolean;
  message: string;
};
```

## Airtable

`AirtableAdapter` maps domain entities to named tables with stable external IDs and batches reads/writes. It validates base/table configuration without returning secrets. Files remain in object storage and only metadata/URLs are persisted. With no credentials, adapter contract tests and a local emulator are valid evidence; “live Airtable verified” remains blocked.

## Accelevents

`AcceleventsAdapter` is one-way from accepted local speakers/sessions to a selected external event. It computes a dry-run diff first, stores external IDs after successful writes, and uses an idempotency key per entity/version. A faithful emulator validates mapping and retry semantics; a live sandbox run is required before claiming provider compatibility.

## Email and calendar

The email adapter renders allowlisted variables, records a delivery attempt, and only sends when the environment is configured for an allowlisted test recipient. Calendar generation is deterministic and local: ICS uses a stable session UID and sequence, while Google/Outlook links are convenience URLs derived from the same canonical schedule.

## Background work

The `JobAdapter` exposes enqueue, cancel, inspect, and execute. Local/demo execution persists jobs in the state document and can be drained deterministically. A Cloudflare Queue/Workflow implementation can replace it without changing reminder or sync domain logic; deployment claims require a real post-deploy readback.

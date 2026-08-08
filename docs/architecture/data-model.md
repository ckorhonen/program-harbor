# Data model

The model is intentionally event-scoped and uses stable IDs. The file adapter stores one versioned state document, while Airtable and a future Cloudflare adapter map each entity to its own table/collection.

## Core entities

`Event(id, slug, name, description, timezone, startsAt, endsAt, branding, demoMode)` owns `Category`, `Track`, `Room`, `SubmissionForm`, `EvaluationPlan`, `ResourcePage`, and the publish settings.

`SubmissionForm(id, eventId, version, status, fields[], routingRules[])` is immutable after publication. `Submission(formVersionId, idempotencyKey, status, answers, route, speakerIds[], audit[])` always points to the version used.

`Speaker(id, eventId, email, name, title, company, bio, headshotFileId, publishState)` and `Session(id, eventId, submissionId, title, description, speakerIds[], trackId, roomId, startsAt, endsAt, status, publicState)` are separate records linked by the accepted submission.

`EvaluationPlan(rounds[], criteria[], assignments[])` produces `Review(submissionId, roundId, evaluatorId, scores, feedback, abstained, submittedAt)`. Aggregates exclude abstentions and preserve every round.

`Task(id, eventId, title, kind, dueAt, required, target, linkedFormId)` produces `TaskAssignment(taskId, speakerId, status, completedAt, evidence)`. `PortalFormResult` and `FileRequest` retain their own audit state.

`ScheduleEntry(sessionId, roomId, startsAt, endsAt, sequence)` is the canonical placement. `Conflict(id, scheduleEntryIds[], kind, message, acknowledgedAt, overrideReason)` is derived after every mutation and never replaces the underlying schedule.

`CommunicationTemplate`, `ScheduledMessage`, `DeliveryLog`, `IntegrationConnection`, `SyncRun`, `SyncItem`, `ResourcePage`, and `AuditEntry` provide inspectable external and consequential state.

## Privacy rules

Public serializers expose only `publishState` speaker fields, public sessions, and approved resources. Email, magic-link tokens, private files, internal notes, evaluator identity, and onboarding details remain role-scoped. File bytes live in `ObjectStoreAdapter`, not Airtable records.

import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { generateICS, buildCalendarLinks } from "@/src/lib/calendar";
import { calculateWeightedReviewScore, completeTaskAssignment, dropHiddenAnswers, evaluateConditionalAnswers, routeSubmission, transitionSubmissionStatus } from "@/src/lib/domain";
import { renderTemplate } from "@/src/lib/comms";
import { findDemoEvent, getStore, recalculateConflicts, stateForView } from "@/src/lib/store";
import type { AppState, Review, ScheduleEntry, Speaker, StoredFile } from "@/src/lib/types";

export const runtime = "nodejs";

const requestCounts = new Map<string, { count: number; resetAt: number }>();

function demoEnabled() {
  return process.env.PROGRAM_HARBOR_DEMO_MODE === "true";
}

function operationId() {
  return `op-${randomUUID()}`;
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

function errorResponse(message: string, status = 400) {
  return json({ error: message, operationId: operationId() }, status);
}

function healthPayload() {
  const storage = process.env.PROGRAM_HARBOR_STORAGE || "file";
  const supported = storage === "file";
  return { status: supported ? "ok" : "degraded", version: "0.1.0", storage, integrations: [{ provider: "Accelevents", mode: "emulator" }, { provider: "Airtable", mode: "disabled" }], message: supported ? "Local file adapter is active." : "Configured storage mode has no adapter in this build." };
}

function protectedRequest(request: NextRequest) {
  return demoEnabled() ? null : errorResponse("This demo-only operation is disabled outside the dedicated demo environment.", 403);
}

async function readBody(request: NextRequest): Promise<Record<string, any>> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) throw new Error("Request body exceeds the 1 MB limit.");
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const raw = await request.text();
    if (raw.length > 1_000_000) throw new Error("Request body exceeds the 1 MB limit.");
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON body must be an object.");
      return parsed as Record<string, any>;
    } catch (error) {
      if (error instanceof Error && error.message !== "JSON body must be an object.") throw new Error("Invalid JSON request body.");
      throw error;
    }
  }
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, typeof value === "string" ? value : { name: value.name, size: value.size, type: value.type }]));
  }
  return {};
}

function rateLimit() {
  const now = Date.now();
  for (const [key, entry] of requestCounts) if (entry.resetAt <= now) requestCounts.delete(key);
  // Keep the demo guard independent of caller-controlled forwarding headers. A
  // production deployment should replace this with a trusted edge limiter.
  const key = "submission-endpoint";
  const current = requestCounts.get(key);
  if (!current || current.resetAt < now) {
    requestCounts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 10;
}

function stateAndView(view: "admin" | "evaluator" | "speaker" | "public") {
  return stateForView(view);
}

function currentState() {
  return getStore().read();
}

function save(mutator: (state: AppState) => void) {
  return getStore().update(mutator);
}

function speakerFor(state: AppState, id?: string) {
  return state.speakers.find((speaker) => speaker.id === id);
}

function sessionFor(state: AppState, id?: string) {
  return state.sessions.find((session) => session.id === id);
}

function withSpeakerDefaults(body: Record<string, any>, eventId: string, id: string): Speaker {
  const now = new Date().toISOString();
  return { id, eventId, email: String(body.speakerEmail || body.email || `${id}@example.test`), name: String(body.speakerName || body.name || "New speaker"), title: String(body.title || "Speaker"), company: String(body.company || "Independent"), bio: String(body.bio || ""), links: [], status: "active", public: false, createdAt: now, updatedAt: now };
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const route = path.join("/");
  if (route === "health") {
    const health = healthPayload();
    return json(health, health.status === "ok" ? 200 : 503);
  }
  if (route === "state") {
    const requestedView = request.nextUrl.searchParams.get("view") || "admin";
    if (!["admin", "evaluator", "speaker", "public"].includes(requestedView)) return errorResponse("Unknown state view.", 422);
    const view = requestedView as "admin" | "evaluator" | "speaker" | "public";
    if (view !== "public") {
      const denied = protectedRequest(request);
      if (denied) return denied;
    }
    return json(stateAndView(view));
  }
  if (route === "sessions" && request.nextUrl.searchParams.get("format") === "calendar") return errorResponse("A session ID is required for a calendar invite.", 422);
  if (route.endsWith("/calendar.ics")) {
    const denied = protectedRequest(request);
    if (denied) return denied;
    const sessionId = route.split("/")[1];
    const state = currentState();
    const session = sessionFor(state, sessionId);
    const placement = state.scheduleEntries.find((entry) => entry.sessionId === sessionId);
    if (!session || !placement) return errorResponse("This session has no saved placement yet.", 404);
    const event = findDemoEvent(state);
    const speaker = speakerFor(state, session.speakerIds[0]);
    const ics = generateICS({ sessionId: session.id, title: session.title, start: placement.startsAt, end: placement.endsAt, timezone: event?.timezone || "UTC", organizer: { name: "Program Harbor", email: "organizer@example.test" }, location: state.rooms.find((room) => room.id === placement.roomId)?.name, description: session.description, attendees: speaker ? [{ name: speaker.name, email: speaker.email, rsvp: true }] : [] });
    return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="${session.id}.ics"`, "cache-control": "no-store" } });
  }
  if (route.startsWith("v1/")) return apiResource(request, route.slice(3));
  return errorResponse("Not found", 404);
}

async function apiResource(request: NextRequest, resource: string) {
  const publicResource = resource === "public/agenda" || resource === "health";
  if (!publicResource) {
    const denied = protectedRequest(request);
    if (denied) return denied;
  }
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") || 25)));
  if (resource === "health") { const health = healthPayload(); return json(health, health.status === "ok" ? 200 : 503); }
  const view = publicResource ? stateForView("public") as any : stateForView("admin") as any;
  const knownResources = new Set(["events", "submissions", "speakers", "sessions", "tasks", "public/agenda"]);
  if (!knownResources.has(resource)) return errorResponse("Unknown API resource.", 404);
  const values = resource === "events" ? [view.event] : resource === "submissions" ? view.submissions : resource === "speakers" ? view.speakers : resource === "sessions" || publicResource ? view.sessions : resource === "tasks" ? view.tasks : [];
  const start = (page - 1) * pageSize;
  const data = values.slice(start, start + pageSize);
  return json({ data, pagination: { page, pageSize, total: values.length, hasNext: start + pageSize < values.length } });
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const route = path.join("/");
  try {
    if (route === "submissions") return createSubmission(request);
    if (route === "reset") {
      const denied = protectedRequest(request);
      if (denied) return denied;
      const reset = getStore().resetDemo();
      return json({ message: "The demo event was reset to its known seed state.", state: stateForView("admin"), reset });
    }
    if (route === "events") return updateEvent(request);
    if (route === "forms") return updateForms(request);
    if (route === "reviews") return saveReview(request);
    if (route === "reminders") return createReminder(request);
    if (route === "messages/preview") return previewMessage(request);
    if (route === "files") return uploadMetadata(request);
    if (route === "integrations/accelevents/dry-run") return dryRunSync(request);
    if (route.startsWith("submissions/") && route.endsWith("/status")) return changeSubmissionStatus(request, route.split("/")[1]);
    if (route.startsWith("tasks/") && route.endsWith("/complete")) return completeTask(request, route.split("/")[1]);
    if (route.startsWith("speakers/")) return updateSpeaker(request, route.split("/")[1]);
    if (route.startsWith("sessions/") && route.endsWith("/schedule")) return scheduleSession(request, route.split("/")[1]);
    return errorResponse("Not found", 404);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Invalid request.", 400);
  }
}

async function createSubmission(request: NextRequest) {
  if (!rateLimit()) return errorResponse("Too many submissions in this demo window. Try again in a minute.", 429);
  const body = await readBody(request);
  const state = currentState();
  const form = state.submissionForms.find((item) => item.status === "published") || state.submissionForms[0];
  const idempotencyKey = String(body.idempotencyKey || "").trim();
  if (!idempotencyKey) return errorResponse("An idempotency key is required for submission acceptance.", 422);
  const existing = state.submissions.find((item) => idempotencyKey && item.idempotencyKey === idempotencyKey);
  if (existing) return json({ message: "This proposal was already received.", submissionId: existing.id, state: stateForView("public") });
  const title = String(body.title || "").trim();
  const abstract = String(body.abstract || "").trim();
  const speakerName = String(body.speakerName || "").trim();
  const speakerEmail = String(body.speakerEmail || "").trim();
  const coSpeakerName = String(body.coSpeakerName || "").trim();
  const coSpeakerEmail = String(body.coSpeakerEmail || "").trim();
  if (!title || !abstract || !speakerName || !speakerEmail) return errorResponse("Title, abstract, speaker name, and email are required.", 422);
  if (title.length > 240 || abstract.length > 8_000 || speakerName.length > 160 || speakerEmail.length > 320 || coSpeakerName.length > 160 || coSpeakerEmail.length > 320) return errorResponse("One or more submission fields exceed the allowed length.", 422);
  if ((coSpeakerName && !coSpeakerEmail) || (!coSpeakerName && coSpeakerEmail)) return errorResponse("Co-speaker name and email must be provided together.", 422);
  const answers = { sessionTitle: String(body.title), abstract: String(body.abstract), sessionFormat: String(body.format || "Talk"), category: String(body.category || "Platform"), ...(body.format === "Workshop" ? { handsOnRequirements: String(body.handsOnRequirements || "") } : {}) };
  const evaluation = evaluateConditionalAnswers(form.fields, answers);
  if (evaluation.missingRequiredKeys.length) return errorResponse(`Complete required fields: ${evaluation.missingRequiredKeys.join(", ")}`, 422);
  const cleanAnswers = dropHiddenAnswers(form.fields, answers);
  const route = routeSubmission(cleanAnswers, state.routingRules, { categoryId: "category-platform", trackId: "track-infrastructure", evaluationPlanId: state.evaluationPlans[0]?.id, reviewQueue: "general-review", tags: ["platform"] });
  const submissionId = `submission-${randomUUID().slice(0, 8)}`;
  const primaryId = `speaker-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const supportingFileInput = body.supportingFile && typeof body.supportingFile === "object" ? body.supportingFile : undefined;
  const supportingFile: StoredFile | undefined = supportingFileInput ? { id: `file-${randomUUID().slice(0, 8)}`, name: String(supportingFileInput.name || "supporting-material"), size: Number(supportingFileInput.size || 0), type: String(supportingFileInput.type || "application/octet-stream"), private: true } : undefined;
  let duplicateSubmissionId: string | undefined;
  const result = save((draft) => {
    const duplicate = draft.submissions.find((item) => item.idempotencyKey === idempotencyKey);
    if (duplicate) { duplicateSubmissionId = duplicate.id; return; }
    const event = findDemoEvent(draft);
    const primary = withSpeakerDefaults(body, event?.id || "event-demo", primaryId);
    draft.speakers.push(primary);
    const coSpeaker = coSpeakerName && coSpeakerEmail ? withSpeakerDefaults({ speakerName: coSpeakerName, speakerEmail: coSpeakerEmail }, event?.id || "event-demo", `speaker-${randomUUID().slice(0, 8)}`) : undefined;
    if (coSpeaker) draft.speakers.push(coSpeaker);
    draft.submissions.push({ id: submissionId, eventId: event?.id || "event-demo", formId: form.id, formVersion: form.version, idempotencyKey, title, description: abstract, answers: cleanAnswers, primarySpeakerId: primaryId, coSpeakerIds: coSpeaker ? [coSpeaker.id] : [], ...(supportingFile ? { supportingFile } : {}), route, status: "submitted", createdAt: now, updatedAt: now });
    draft.auditEntries.push({ id: `audit-${randomUUID().slice(0, 8)}`, eventId: event?.id || "event-demo", action: "submission.created", entityType: "submission", entityId: submissionId, actorId: "public-submitter", createdAt: now, details: { routingSource: route.source, categoryId: route.categoryId || null, formVersion: form.version, supportingFile: Boolean(supportingFile) } });
  });
  if (duplicateSubmissionId) return json({ message: "This proposal was already received.", submissionId: duplicateSubmissionId, state: stateForView("public") });
  return json({ message: `Proposal routed to ${route.reviewQueue || "general review"}.`, submissionId, state: stateForView("public"), revision: result.revision }, 201);
}

async function changeSubmissionStatus(request: NextRequest, submissionId: string) {
  const denied = protectedRequest(request); if (denied) return denied;
  const body = await readBody(request); const next = body.status as any; let error: string | undefined;
  try {
    save((draft) => {
      const submission = draft.submissions.find((item) => item.id === submissionId);
      if (!submission) throw new Error("Submission not found.");
      transitionSubmissionStatus(submission.status, next);
      submission.status = next;
      submission.updatedAt = new Date().toISOString();
      if (next === "accepted") {
        const speaker = speakerFor(draft, submission.primarySpeakerId) || withSpeakerDefaults({ speakerName: "Accepted speaker", speakerEmail: "speaker@example.test" }, submission.eventId, `speaker-${randomUUID().slice(0, 8)}`);
        if (!draft.speakers.some((item) => item.id === speaker.id)) draft.speakers.push(speaker);
        if (!draft.sessions.some((session) => session.submissionId === submission.id)) draft.sessions.push({ id: `session-${randomUUID().slice(0, 8)}`, eventId: submission.eventId, submissionId: submission.id, title: submission.title, description: submission.description, speakerIds: [speaker.id, ...submission.coSpeakerIds], coSpeakerIds: submission.coSpeakerIds, trackId: submission.route?.trackId || draft.tracks[0].id, categoryId: submission.route?.categoryId || draft.categories[0].id, status: "accepted", public: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      draft.auditEntries.push({ id: `audit-${randomUUID().slice(0, 8)}`, eventId: submission.eventId, action: `submission.${next}`, entityType: "submission", entityId: submissionId, actorId: "demo-admin", createdAt: new Date().toISOString() });
    });
  } catch (err) { error = err instanceof Error ? err.message : "Status change failed."; }
  if (error) return errorResponse(error, 422);
  return json({ message: `Submission marked ${next}.`, state: stateForView("admin") });
}

async function saveReview(request: NextRequest) {
  const denied = protectedRequest(request); if (denied) return denied;
  const body = await readBody(request); const state = currentState(); const plan = state.evaluationPlans[0]; const round = state.evaluationRounds[0];
  const submissionId = String(body.submissionId || "");
  const assignment = state.evaluationAssignments.find((item) => item.submissionId === submissionId && item.evaluatorId === "evaluator-01" && item.roundId === round?.id);
  if (!plan || !round || !assignment) return errorResponse("This submission is not assigned to the current evaluator and round.", 403);
  const submittedScores = body.scores && typeof body.scores === "object" ? body.scores : {};
  const abstained = Object.values(submittedScores).includes("abstain");
  const allowedCriteria = new Map(state.rubricCriteria.filter((criterion) => criterion.evaluationPlanId === plan.id).map((criterion) => [criterion.id, criterion]));
  const scoreEntries = Object.entries(submittedScores).filter(([, value]) => value !== "abstain");
  if (scoreEntries.some(([key, value]) => !allowedCriteria.has(key) || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > Number(allowedCriteria.get(key)?.maxScore))) return errorResponse("Each review score must use an assigned criterion and stay within its rubric range.", 422);
  if (!abstained && scoreEntries.length !== allowedCriteria.size) return errorResponse("Complete every rubric criterion or abstain for a documented conflict.", 422);
  const reviewId = `review-${randomUUID().slice(0, 8)}`; const scores = Object.fromEntries(scoreEntries.map(([key, value]) => [key, Number(value)]));
  save((draft) => { const review: Review = { id: reviewId, roundId: round.id, submissionId, evaluatorId: "evaluator-01", status: abstained ? "abstained" : "submitted", abstained, scores, feedback: String(body.feedback || "").slice(0, 4_000), submittedAt: new Date().toISOString() }; draft.reviews = draft.reviews.filter((item) => !(item.submissionId === review.submissionId && item.evaluatorId === review.evaluatorId && item.roundId === round.id)); draft.reviews.push(review); const draftAssignment = draft.evaluationAssignments.find((item) => item.submissionId === review.submissionId && item.evaluatorId === review.evaluatorId && item.roundId === round.id); if (draftAssignment) draftAssignment.status = review.abstained ? "abstained" : "submitted"; });
  return json({ message: `Review saved for ${plan.name}.`, state: stateForView("admin") });
}

async function completeTask(request: NextRequest, assignmentId: string) {
  const denied = protectedRequest(request); if (denied) return denied;
  const body = await readBody(request); let error: string | undefined;
  if (String(body.speakerId || "") !== "speaker-01") return errorResponse("This demo portal is scoped to speaker-01.", 403);
  try { save((draft) => { const assignment = draft.taskAssignments.find((item) => item.id === assignmentId); if (!assignment) throw new Error("Task assignment not found."); if (body.speakerId && assignment.speakerId !== body.speakerId) throw new Error("This task does not belong to the current speaker."); const speaker = draft.speakers.find((item) => item.id === assignment.speakerId); if (!speaker) throw new Error("Task speaker not found."); const updated = completeTaskAssignment(assignment, new Date().toISOString()); Object.assign(assignment, updated); draft.auditEntries.push({ id: `audit-${randomUUID().slice(0, 8)}`, eventId: speaker.eventId, action: "task.completed", entityType: "taskAssignment", entityId: assignmentId, actorId: String(body.speakerId || "demo-admin"), createdAt: new Date().toISOString() }); }); } catch (err) { error = err instanceof Error ? err.message : "Task update failed."; }
  if (error) return errorResponse(error, 422);
  return json({ message: "Task marked complete; the dashboard will refresh within five seconds.", state: stateForView(body.speakerId ? "speaker" : "admin") });
}

async function updateSpeaker(request: NextRequest, speakerId: string) {
  const denied = protectedRequest(request); if (denied) return denied; const body = await readBody(request); let found = false;
  if (speakerId !== "speaker-01") return errorResponse("This demo portal is scoped to speaker-01.", 403);
  save((draft) => { const speaker = speakerFor(draft, speakerId); if (!speaker) return; found = true; for (const key of ["name", "title", "company", "bio"] as const) if (body[key] !== undefined) speaker[key] = String(body[key]); speaker.updatedAt = new Date().toISOString(); });
  if (!found) return errorResponse("Speaker not found.", 404);
  return json({ message: "Speaker profile saved.", state: stateForView("speaker") });
}

async function uploadMetadata(request: NextRequest) {
  const denied = protectedRequest(request); if (denied) return denied; const body = await readBody(request); const fileId = `file-${randomUUID().slice(0, 8)}`;
  if (String(body.speakerId || "") !== "speaker-01") return errorResponse("A speaker owner is required for private file metadata.", 403);
  if (!String(body.name || "").trim() || !Number.isFinite(Number(body.size)) || Number(body.size) < 0 || Number(body.size) > 25 * 1024 * 1024) return errorResponse("File metadata is invalid or exceeds the 25 MB limit.", 422);
  const state = save((draft) => { const speaker = speakerFor(draft, body.speakerId || "speaker-01"); if (speaker) { if (String(body.type || "").startsWith("image")) speaker.headshotFileId = fileId; else speaker.slidesFileId = fileId; speaker.updatedAt = new Date().toISOString(); } draft.auditEntries.push({ id: `audit-${randomUUID().slice(0, 8)}`, eventId: speaker?.eventId || "event-ai-engineer-sandbox-summit", action: "file.metadata.created", entityType: "file", entityId: fileId, actorId: String(body.speakerId || "demo-speaker"), createdAt: new Date().toISOString(), details: { name: String(body.name || "upload"), size: Number(body.size || 0), type: String(body.type || "application/octet-stream"), private: true } }); });
  return json({ message: `${String(body.name || "File")} stored as private metadata.`, file: { id: fileId, name: body.name, private: true }, state: stateForView(body.speakerId ? "speaker" : "public"), revision: state.revision });
}

async function scheduleSession(request: NextRequest, sessionId: string) {
  const denied = protectedRequest(request); if (denied) return denied; const body = await readBody(request); const start = new Date(String(body.startsAt)); const end = new Date(String(body.endsAt)); if (!(start < end)) return errorResponse("End time must be after start time.", 422);
  const overrideReason = String(body.overrideReason || "").trim();
  if (body.override && !overrideReason) return errorResponse("An override reason is required when acknowledging a conflict.", 422);
  let conflict = false; let error: string | undefined;
  try { save((draft) => { const session = sessionFor(draft, sessionId); if (!session) throw new Error("Session not found."); const existing = draft.scheduleEntries.find((entry) => entry.sessionId === sessionId); const entry: ScheduleEntry = { id: existing?.id || `schedule-${randomUUID().slice(0, 8)}`, eventId: session.eventId, sessionId, roomId: String(body.roomId), startsAt: start.toISOString(), endsAt: end.toISOString(), speakerIds: session.speakerIds, moderatorIds: [] }; const others = draft.scheduleEntries.filter((item) => item.sessionId !== sessionId); draft.scheduleEntries = [...others, entry]; recalculateConflicts(draft); conflict = draft.conflicts.some((item) => item.scheduleEntryIds.includes(entry.id) && !item.overridden); if (conflict && !body.override) throw new Error("This placement creates a room or speaker conflict. Review it or acknowledge an override."); if (conflict && body.override) { entry.override = { acknowledged: true, reason: overrideReason }; recalculateConflicts(draft); } draft.auditEntries.push({ id: `audit-${randomUUID().slice(0, 8)}`, eventId: session.eventId, action: body.override ? "schedule.overridden" : "schedule.updated", entityType: "scheduleEntry", entityId: entry.id, actorId: "demo-admin", createdAt: new Date().toISOString(), details: { conflict, roomId: entry.roomId, startsAt: entry.startsAt, endsAt: entry.endsAt, overrideReason: body.override ? overrideReason : null } }); }); } catch (err) { error = err instanceof Error ? err.message : "Schedule update failed."; }
  if (error) return errorResponse(error, 409);
  return json({ message: conflict ? "Placement saved with an audited conflict override." : "Placement saved and conflict checks are clear.", state: stateForView("admin") });
}

async function updateEvent(request: NextRequest) { const denied = protectedRequest(request); if (denied) return denied; const body = await readBody(request); save((draft) => { const event = findDemoEvent(draft); if (!event) return; if (body.name) event.name = String(body.name); if (body.timezone) event.timezone = String(body.timezone); if (body.description) event.description = String(body.description); }); return json({ message: "Event settings saved.", state: stateForView("admin") }); }
async function updateForms(request: NextRequest) { const denied = protectedRequest(request); if (denied) return denied; const body = await readBody(request); save((draft) => { const form = draft.submissionForms[0]; if (!form) return; if (body.action === "publish") form.status = "published"; if (body.action === "add" && body.field) form.fields.push({ id: `field-${randomUUID().slice(0, 8)}`, key: String(body.field.key || "newField"), label: String(body.field.label || "New question"), type: body.field.type || "shortText", required: Boolean(body.field.required) }); form.version += 1; }); return json({ message: body.action === "publish" ? "CFP version published." : "Field added to the draft.", state: stateForView("admin") }); }
async function createReminder(request: NextRequest) { const denied = protectedRequest(request); if (denied) return denied; const body = await readBody(request); save((draft) => { const event = findDemoEvent(draft); const task = draft.tasks.find((item) => item.id === body.taskId) || draft.tasks.find((item) => item.required); if (event && task) draft.reminders.push({ id: `reminder-${randomUUID().slice(0, 8)}`, eventId: event.id, title: "Demo missing-task reminder", taskId: task.id, scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), status: "scheduled", recipientFilter: "incompleteRequiredWork" }); }); return json({ message: body.mode === "preview" ? "Reminder audience previewed; no send occurred." : "Reminder scheduled for incomplete required work.", state: stateForView("admin") }); }
async function previewMessage(request: NextRequest) { const denied = protectedRequest(request); if (denied) return denied; const body = await readBody(request); const state = currentState(); const template = state.communicationTemplates.find((item) => item.kind === (body.template === "reminder" ? "reminder" : "acceptance")) || state.communicationTemplates[0]; if (!template) return errorResponse("No template is configured.", 422); let rendered = ""; try { rendered = renderTemplate(`${template.subject}\n\n${template.body}`, { speakerName: "Jordan Lee", eventName: findDemoEvent(state)?.name || "AI Engineer Sandbox Summit", sessionTitle: "Secure by default", room: "Workshop Room", sessionDate: "Sep 17", sessionTime: "10:00 AM", eventTimezone: findDemoEvent(state)?.timezone || "America/New_York", portalUrl: "/portal", outstandingTaskList: "speaker details", dueDate: "Aug 14" }); } catch (err) { return errorResponse(err instanceof Error ? err.message : "Template cannot render.", 422); } return json({ message: "Preview rendered; no email was sent.", rendered, state: stateForView("admin") }); }
async function dryRunSync(request: NextRequest) { const denied = protectedRequest(request); if (denied) return denied; const state = currentState(); return json({ message: "Accelevents emulator dry-run completed with no external writes.", mode: "emulator", diff: { create: 2, update: 4, noChange: 8, deletes: 0 }, state: stateForView("admin"), revision: state.revision }); }

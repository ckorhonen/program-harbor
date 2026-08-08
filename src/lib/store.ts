import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { calculateOnboardingMetrics, calculateWeightedReviewScore, detectScheduleConflicts } from "./domain";
import { DEMO_EVENT_ID, DEMO_NAMESPACE, seedDemoState } from "./seed";
import type { AppState, Id, ScheduleEntry } from "./types";

const configuredDataRoot = process.env.PROGRAM_HARBOR_DATA_DIR;
const dataRoot = configuredDataRoot ? path.resolve(configuredDataRoot) : path.join(process.cwd(), ".data");
const statePath = path.join(dataRoot, "program-harbor.json");
let cachedState: AppState | undefined;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureStateFile(): void {
  if (existsSync(statePath)) return;
  mkdirSync(dataRoot, { recursive: true, mode: 0o700 });
  chmodSync(dataRoot, 0o700);
  writeFileSync(statePath, JSON.stringify(seedDemoState(), null, 2), { mode: 0o600 });
  chmodSync(statePath, 0o600);
}

function readDisk(): AppState {
  ensureStateFile();
  return JSON.parse(readFileSync(statePath, "utf8")) as AppState;
}

function persist(next: AppState): AppState {
  mkdirSync(dataRoot, { recursive: true, mode: 0o700 });
  chmodSync(dataRoot, 0o700);
  const temporaryPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(next, null, 2), { mode: 0o600 });
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, statePath);
  chmodSync(statePath, 0o600);
  cachedState = clone(next);
  return clone(next);
}

export interface ProgramStore {
  read(): AppState;
  write(next: AppState): AppState;
  update(mutator: (draft: AppState) => void): AppState;
  resetDemo(): AppState;
}

const store: ProgramStore = {
  read() {
    if (!cachedState) cachedState = readDisk();
    return clone(cachedState);
  },
  write(next) {
    const onDisk = readDisk();
    if (onDisk.revision !== next.revision) throw new Error("Concurrent state update detected; reload and retry.");
    const updated = { ...clone(next), revision: next.revision + 1, updatedAt: new Date().toISOString() };
    return persist(updated);
  },
  update(mutator) {
    const draft = this.read();
    mutator(draft);
    return this.write(draft);
  },
  resetDemo() {
    if (process.env.PROGRAM_HARBOR_DEMO_MODE !== "true") {
      throw new Error("Demo reset is disabled outside the dedicated demo environment.");
    }
    return persist(seedDemoState());
  },
};

export function getStore(): ProgramStore {
  return store;
}

export function resetDemo(): AppState {
  return store.resetDemo();
}

export type ViewRole = "admin" | "evaluator" | "speaker" | "public";

function eventFrom(state: AppState) {
  return state.events.find((event) => event.id === DEMO_EVENT_ID) || state.events[0];
}

function speakerName(state: AppState, id?: Id): string {
  return state.speakers.find((speaker) => speaker.id === id)?.name || "Speaker";
}

function categoryName(state: AppState, id?: Id): string {
  return state.categories.find((category) => category.id === id)?.name || "General";
}

function trackName(state: AppState, id?: Id): string {
  return state.tracks.find((track) => track.id === id)?.name || "General";
}

function roomName(state: AppState, id?: Id): string {
  return state.rooms.find((room) => room.id === id)?.name || "TBA";
}

function scheduleFor(state: AppState, sessionId: Id) {
  return state.scheduleEntries.find((entry) => entry.sessionId === sessionId);
}

function scoreFor(state: AppState, submissionId: Id): number | null {
  const reviews = state.reviews.filter((review) => review.submissionId === submissionId);
  const criteria = state.rubricCriteria.filter((criterion) => criterion.evaluationPlanId === state.evaluationPlans[0]?.id);
  if (!reviews.length || !criteria.length) return null;
  return calculateWeightedReviewScore(criteria, reviews).weightedScore;
}

function adminTasks(state: AppState) {
  return state.taskAssignments.map((assignment) => {
    const task = state.tasks.find((item) => item.id === assignment.taskId);
    return {
      id: assignment.id,
      taskId: assignment.taskId,
      title: task?.title || "Speaker task",
      description: task?.description || "",
      kind: task?.kind || "general",
      required: task?.required ?? true,
      dueAt: task?.dueAt,
      status: assignment.status === "completed" ? "complete" : task && new Date(task.dueAt).getTime() < Date.now() ? "overdue" : "pending",
      speakerId: assignment.speakerId,
      speakerName: speakerName(state, assignment.speakerId),
    };
  });
}

function publicState(state: AppState) {
  const event = eventFrom(state);
  return {
    event: event ? {
      id: event.id,
      name: event.name,
      slug: event.slug,
      description: event.description,
      timezone: event.timezone,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      status: event.status,
      branding: event.branding,
      defaultSessionDurationMinutes: event.defaultSessionDurationMinutes,
    } : undefined,
    revision: state.revision,
    updatedAt: state.updatedAt,
    sessions: state.sessions.filter((session) => session.public && session.status !== "draft").map((session) => {
      const placement = scheduleFor(state, session.id);
      return {
        id: session.id,
        title: session.title,
        description: session.description,
        status: session.status,
        publicState: session.public ? "published" : "hidden",
        startsAt: placement?.startsAt,
        endsAt: placement?.endsAt,
        roomName: roomName(state, placement?.roomId),
        track: trackName(state, session.trackId),
        speakerName: speakerName(state, session.speakerIds[0]),
      };
    }),
    speakers: state.speakers.filter((speaker) => speaker.public).map((speaker) => ({
      id: speaker.id,
      name: speaker.name,
      title: speaker.title,
      company: speaker.company,
      bio: speaker.bio,
      track: trackName(state, state.sessions.find((session) => session.speakerIds.includes(speaker.id))?.trackId),
    })),
  };
}

export function stateForView(role: ViewRole): Record<string, unknown> {
  const state = store.read();
  if (role === "public") return publicState(state);
  const event = eventFrom(state);
  const metrics = calculateOnboardingMetrics(state.speakers, state.tasks, state.taskAssignments, state.portalFormResults);
  const tasks = adminTasks(state);
  const sessions = state.sessions.map((session) => {
    const placement = scheduleFor(state, session.id);
    const conflict = state.conflicts.some((item) => item.scheduleEntryIds.includes(placement?.id || "") && !item.overridden);
    return {
      ...session,
      roomId: placement?.roomId,
      roomName: roomName(state, placement?.roomId),
      startsAt: placement?.startsAt,
      endsAt: placement?.endsAt,
      track: trackName(state, session.trackId),
      speakerName: speakerName(state, session.speakerIds[0]),
      conflict,
    };
  });
  const speakers = state.speakers.map((speaker) => {
    const assignments = state.taskAssignments.filter((assignment) => assignment.speakerId === speaker.id);
    const required = assignments.filter((assignment) => state.tasks.find((task) => task.id === assignment.taskId)?.required);
    const complete = required.filter((assignment) => assignment.status === "completed").length;
    const session = state.sessions.find((item) => item.speakerIds.includes(speaker.id));
    const next = assignments.map((assignment) => state.tasks.find((task) => task.id === assignment.taskId)).find(Boolean);
    return { ...speaker, track: trackName(state, session?.trackId), completion: required.length ? Math.round((complete / required.length) * 100) : 100, nextDueLabel: next ? new Date(next.dueAt).getTime() < Date.now() ? "Overdue" : "Due soon" : "Ready" };
  });
  const submissions = state.submissions.map((submission) => ({
    ...submission,
    speakerName: speakerName(state, submission.primarySpeakerId),
    category: categoryName(state, submission.route?.categoryId),
    reviewPlan: submission.route?.reviewQueue === "security-review" ? "Security review plan" : submission.route?.reviewQueue === "design-review" ? "Design review plan" : "General review plan",
    reviewProgress: `${state.reviews.filter((review) => review.submissionId === submission.id).length} / 3`,
    score: scoreFor(state, submission.id),
  }));
  const base = {
    event: { ...event, tracks: state.tracks, rooms: state.rooms },
    revision: state.revision,
    updatedAt: state.updatedAt,
    submissions,
    speakers,
    sessions,
    tasks,
    conflicts: state.conflicts.map((conflict) => ({ ...conflict, sessions: conflict.scheduleEntryIds.map((entryId) => state.scheduleEntries.find((entry) => entry.id === entryId)?.sessionId).filter(Boolean).map((sessionId) => state.sessions.find((session) => session.id === sessionId)?.title).join(" · ") })),
    forms: state.submissionForms,
    evaluations: [{ ...state.evaluationPlans[0], criteria: state.rubricCriteria.map((criterion) => criterion.label), criterionIds: state.rubricCriteria.map((criterion) => criterion.id), submissionTitle: state.submissions[0]?.title, speakerName: speakerName(state, state.submissions[0]?.primarySpeakerId), abstract: state.submissions[0]?.description, submissionId: state.submissions[0]?.id }],
    templates: Object.fromEntries(state.communicationTemplates.map((template) => [template.kind === "reminder" ? "reminder" : "acceptance", template])),
    resources: state.resourcePages,
    integrations: [
      { provider: "Email", mode: "emulator", configured: false, message: "Preview-only demo transport; no recipient sends." },
      { provider: "Calendar", mode: "local", configured: true, message: "ICS generation and links available." },
      { provider: "Accelevents", mode: "emulator", configured: false, message: "Live credential missing; dry-run emulator is available." },
      { provider: "Airtable", mode: "disabled", configured: false, message: "No base or API key configured." },
    ],
    stats: {
      totalSpeakers: metrics.totalSpeakers,
      acceptedSpeakers: state.speakers.length,
      onboardedSpeakers: metrics.fullyOnboardedSpeakers,
      outstandingTasks: metrics.speakersWithOutstandingWork,
      overdueTasks: metrics.overdueTasks,
      completionPercent: metrics.completionPercentage,
      scheduledSessions: state.scheduleEntries.length,
      acceptedSessions: state.sessions.length,
      unscheduledSessions: state.sessions.length - state.scheduleEntries.length,
      conflicts: state.conflicts.filter((conflict) => !conflict.overridden).length,
    },
  };
  if (role === "evaluator") {
    const assignedSubmissions = submissions.filter((submission) => submission.id === "submission-01" || submission.id === "submission-02");
    const assignedSpeakerIds = new Set(assignedSubmissions.flatMap((submission) => [submission.primarySpeakerId, ...(submission.coSpeakerIds || [])]).filter(Boolean));
    const assignedSpeakers = speakers.filter((speaker) => assignedSpeakerIds.has(speaker.id)).map(({ email: _email, links: _links, ...speaker }) => speaker);
    return { event: base.event, revision: base.revision, updatedAt: base.updatedAt, submissions: assignedSubmissions, speakers: assignedSpeakers, evaluations: assignedSubmissions.map((submission) => ({ criteria: state.rubricCriteria.map((criterion) => criterion.label), criterionIds: state.rubricCriteria.map((criterion) => criterion.id), submissionTitle: submission.title, abstract: submission.description, submissionId: submission.id, speakerName: submission.speakerName })) };
  }
  if (role === "speaker") {
    const currentSpeaker = speakers.find((speaker) => speaker.id === "speaker-01");
    const speakerSubmissions = submissions.filter((submission) => submission.primarySpeakerId === "speaker-01" || submission.coSpeakerIds?.includes("speaker-01"));
    return { event: { id: event.id, name: event.name, timezone: event.timezone, startsAt: event.startsAt, endsAt: event.endsAt }, revision: base.revision, updatedAt: base.updatedAt, currentSpeaker, speakers: currentSpeaker ? [currentSpeaker] : [], submissions: speakerSubmissions, tasks: tasks.filter((task) => task.speakerId === "speaker-01" || task.speakerId === undefined).slice(0, 6) };
  }
  return base;
}

export function recalculateConflicts(state: AppState): void {
  const event = eventFrom(state);
  state.conflicts = detectScheduleConflicts(state.scheduleEntries, { startsAt: event?.startsAt || "", endsAt: event?.endsAt || "" });
}

export function findDemoEvent(state: AppState) {
  return state.events.find((event) => event.id === DEMO_EVENT_ID) || state.events[0];
}

export { DEMO_EVENT_ID, DEMO_NAMESPACE };

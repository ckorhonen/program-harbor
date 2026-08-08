import { detectScheduleConflicts, routeSubmission } from "./domain";
import type {
  AppState,
  AuditEntry,
  Category,
  CommunicationTemplate,
  DemoAccess,
  EvaluationAssignment,
  EvaluationPlan,
  EvaluationRound,
  Evaluator,
  Event,
  FormField,
  Id,
  PortalForm,
  PortalFormResult,
  ResourcePage,
  Review,
  Room,
  RoutingRule,
  RubricCriterion,
  ScheduleEntry,
  ScheduledReminder,
  Session,
  Speaker,
  Submission,
  SubmissionForm,
  Task,
  TaskAssignment,
  Track,
} from "./types";

export const DEMO_EVENT_ID = "event-ai-engineer-sandbox-summit";
export const DEMO_NAMESPACE = "demo";
export const DEMO_NOW = "2026-08-08T12:00:00.000Z";

const eventStartsAt = "2026-09-17T09:00:00-04:00";
const eventEndsAt = "2026-09-18T18:00:00-04:00";

const categories: Category[] = [
  {
    id: "category-security",
    eventId: DEMO_EVENT_ID,
    name: "Security",
    slug: "security",
    color: "#b6423d",
  },
  {
    id: "category-design",
    eventId: DEMO_EVENT_ID,
    name: "Design Engineering",
    slug: "design-engineering",
    color: "#8d5a9f",
  },
  {
    id: "category-platform",
    eventId: DEMO_EVENT_ID,
    name: "Platform",
    slug: "platform",
    color: "#256d75",
  },
];

const tracks: Track[] = [
  { id: "track-safety", eventId: DEMO_EVENT_ID, name: "Safety & Trust", color: "#b6423d" },
  { id: "track-product", eventId: DEMO_EVENT_ID, name: "Product Systems", color: "#8d5a9f" },
  { id: "track-infrastructure", eventId: DEMO_EVENT_ID, name: "Infrastructure", color: "#256d75" },
];

const rooms: Room[] = [
  { id: "room-harbor", eventId: DEMO_EVENT_ID, name: "Harbor Hall", capacity: 500 },
  { id: "room-workshop", eventId: DEMO_EVENT_ID, name: "Workshop Room", capacity: 120 },
  { id: "room-studio", eventId: DEMO_EVENT_ID, name: "Studio", capacity: 80 },
  { id: "room-forum", eventId: DEMO_EVENT_ID, name: "Forum", capacity: 60 },
];

const event: Event = {
  id: DEMO_EVENT_ID,
  name: "AI Engineer Sandbox Summit",
  slug: "ai-engineer-sandbox-summit",
  description: "A two-day working summit for engineers building dependable AI systems.",
  timezone: "America/New_York",
  startsAt: eventStartsAt,
  endsAt: eventEndsAt,
  status: "published",
  branding: { accentColor: "#173f43" },
  defaultSessionDurationMinutes: 45,
  submissionStatuses: ["draft", "submitted", "under_review", "accepted", "waitlisted", "declined", "withdrawn"],
  demoMode: true,
};

const formFields: FormField[] = [
  {
    id: "field-title",
    key: "sessionTitle",
    label: "Session title",
    type: "shortText",
    required: true,
    mapping: "session",
  },
  {
    id: "field-format",
    key: "sessionFormat",
    label: "Session format",
    type: "radio",
    required: true,
    options: [
      { value: "Talk", label: "Talk" },
      { value: "Workshop", label: "Workshop" },
    ],
  },
  {
    id: "field-hands-on",
    key: "handsOnRequirements",
    label: "Hands-on requirements",
    type: "longText",
    required: true,
    visibility: [{ fieldKey: "sessionFormat", operator: "equals", value: "Workshop" }],
    helpText: "Tell us what attendees need to bring or install.",
  },
  {
    id: "field-category",
    key: "category",
    label: "Primary category",
    type: "singleSelect",
    required: true,
    options: [
      { value: "Security", label: "Security" },
      { value: "Design Engineering", label: "Design Engineering" },
      { value: "Platform", label: "Platform" },
    ],
  },
  {
    id: "field-abstract",
    key: "abstract",
    label: "Session abstract",
    type: "longText",
    required: true,
    mapping: "session",
  },
];

const routingRules: RoutingRule[] = [
  {
    id: "route-security",
    eventId: DEMO_EVENT_ID,
    name: "Security review",
    priority: 100,
    conditions: [{ fieldKey: "category", operator: "equals", value: "Security" }],
    target: {
      categoryId: "category-security",
      trackId: "track-safety",
      evaluationPlanId: "evaluation-plan-standard",
      reviewQueue: "security-review",
      tags: ["security"],
    },
    enabled: true,
  },
  {
    id: "route-design",
    eventId: DEMO_EVENT_ID,
    name: "Design review",
    priority: 90,
    conditions: [{ fieldKey: "category", operator: "equals", value: "Design Engineering" }],
    target: {
      categoryId: "category-design",
      trackId: "track-product",
      evaluationPlanId: "evaluation-plan-standard",
      reviewQueue: "design-review",
      tags: ["design"],
    },
    enabled: true,
  },
];

const submissionForm: SubmissionForm = {
  id: "form-cfp-v1",
  eventId: DEMO_EVENT_ID,
  title: "Call for Speakers",
  description: "Propose a practical session for the AI Engineer Sandbox Summit.",
  version: 1,
  status: "published",
  shareSlug: "ai-engineer-sandbox-summit",
  fields: formFields,
  routingRuleIds: routingRules.map((rule) => rule.id),
  createdAt: "2026-07-15T14:00:00.000Z",
  updatedAt: "2026-08-01T14:00:00.000Z",
};

const evaluators: Evaluator[] = [
  { id: "evaluator-01", eventId: DEMO_EVENT_ID, name: "Maya Chen", email: "maya@example.test" },
  { id: "evaluator-02", eventId: DEMO_EVENT_ID, name: "Jon Bell", email: "jon@example.test" },
  { id: "evaluator-03", eventId: DEMO_EVENT_ID, name: "Priya Rao", email: "priya@example.test" },
];

const evaluationPlan: EvaluationPlan = {
  id: "evaluation-plan-standard",
  eventId: DEMO_EVENT_ID,
  name: "Summit review plan",
  instructions: "Score the proposal against the visible rubric and leave useful feedback for the organizer.",
  blindReview: false,
  allowConflictsOfInterest: true,
  roundIds: ["evaluation-round-1", "evaluation-round-2"],
  criterionIds: [
    "criterion-usefulness",
    "criterion-technical",
    "criterion-originality",
    "criterion-clarity",
    "criterion-feasibility",
  ],
};

const evaluationRounds: EvaluationRound[] = [
  {
    id: "evaluation-round-1",
    evaluationPlanId: evaluationPlan.id,
    name: "Initial review",
    order: 1,
    opensAt: "2026-07-20T09:00:00-04:00",
    closesAt: "2026-08-20T23:59:00-04:00",
  },
  {
    id: "evaluation-round-2",
    evaluationPlanId: evaluationPlan.id,
    name: "Final panel",
    order: 2,
    opensAt: "2026-08-21T09:00:00-04:00",
    closesAt: "2026-08-28T23:59:00-04:00",
  },
];

const rubricCriteria: RubricCriterion[] = [
  {
    id: "criterion-usefulness",
    evaluationPlanId: evaluationPlan.id,
    key: "usefulness",
    label: "Attendee usefulness",
    description: "Will attendees leave with a concrete technique or insight?",
    weight: 30,
    maxScore: 5,
  },
  {
    id: "criterion-technical",
    evaluationPlanId: evaluationPlan.id,
    key: "technical",
    label: "Technical depth",
    description: "Does the proposal show enough technical substance for this audience?",
    weight: 25,
    maxScore: 5,
  },
  {
    id: "criterion-originality",
    evaluationPlanId: evaluationPlan.id,
    key: "originality",
    label: "Originality",
    description: "Does it add a perspective that is not generic conference filler?",
    weight: 20,
    maxScore: 5,
  },
  {
    id: "criterion-clarity",
    evaluationPlanId: evaluationPlan.id,
    key: "clarity",
    label: "Clarity",
    description: "Can an attendee understand the promise and level from the proposal?",
    weight: 15,
    maxScore: 5,
  },
  {
    id: "criterion-feasibility",
    evaluationPlanId: evaluationPlan.id,
    key: "feasibility",
    label: "Delivery feasibility",
    description: "Can this speaker deliver the session in the available format and time?",
    weight: 10,
    maxScore: 5,
  },
];

function speakerId(number: number): Id {
  return `speaker-${String(number).padStart(2, "0")}`;
}

function submissionId(number: number): Id {
  return `submission-${String(number).padStart(2, "0")}`;
}

const submissionStatuses = [
  ...Array.from({ length: 8 }, () => "accepted" as const),
  ...Array.from({ length: 3 }, () => "waitlisted" as const),
  "declined" as const,
];

const coSpeakerBySubmission: Record<number, Id[]> = {
  1: [speakerId(9)],
  2: [speakerId(10)],
  4: [speakerId(3)],
};

const submissionTitles = [
  "Threat modeling for agentic workflows",
  "Designing evaluations that teach product teams",
  "A practical reliability loop for tool-using models",
  "Shipping a useful model behavior dashboard",
  "Hands-on: tracing a production agent safely",
  "The human factors of incident-ready AI",
  "Small models, serious observability",
  "Building a review queue people actually finish",
  "A field guide to prompt regression tests",
  "Making retrieval failures legible",
  "From notebook to reliable service",
  "Why agent demos break at the handoff",
];

const submissions: Submission[] = submissionStatuses.map((status, index) => {
  const number = index + 1;
  const category = number === 1 || number === 5 ? "Security" : number === 2 || number === 6 ? "Design Engineering" : "Platform";
  const answers = {
    sessionTitle: submissionTitles[index],
    sessionFormat: number === 1 || number === 5 ? "Workshop" : "Talk",
    category,
    abstract: `A concrete session about ${submissionTitles[index].toLowerCase()}.`,
    ...(number === 1 || number === 5 ? { handsOnRequirements: "Bring a laptop with Docker installed." } : {}),
  };

  return {
    id: submissionId(number),
    eventId: DEMO_EVENT_ID,
    formId: submissionForm.id,
    formVersion: submissionForm.version,
    idempotencyKey: `demo-${submissionId(number)}`,
    title: submissionTitles[index],
    description: String(answers.abstract),
    answers,
    primarySpeakerId: speakerId(((number - 1) % 10) + 1),
    coSpeakerIds: coSpeakerBySubmission[number] ?? [],
    route: routeSubmission(answers, routingRules, {
      categoryId: "category-platform",
      trackId: "track-infrastructure",
      evaluationPlanId: evaluationPlan.id,
      reviewQueue: "general-review",
      tags: ["platform"],
    }),
    status,
    createdAt: `2026-07-${String(10 + index).padStart(2, "0")}T15:00:00.000Z`,
    updatedAt: `2026-08-${String(1 + (index % 7)).padStart(2, "0")}T15:00:00.000Z`,
  };
});

const speakers: Speaker[] = Array.from({ length: 10 }, (_, index) => {
  const number = index + 1;
  const missingBio = number === 4;
  const missingHeadshot = number === 2;
  const missingSlides = number === 3;
  return {
    id: speakerId(number),
    eventId: DEMO_EVENT_ID,
    email: `speaker${number}@example.test`,
    name: ["Ava Patel", "Noah Kim", "Elena Rossi", "Marcus Green", "Sofia Diaz", "Owen Brooks", "Leila Shah", "Theo Martin", "Nia Cole", "Iris Wong"][index],
    title: "AI Engineer",
    company: ["Northstar", "Kindred", "Fieldnote", "Signal House", "Orbit", "Tern", "Common Thread", "Lumen", "Civic Lab", "Mosaic"][index],
    bio: missingBio ? "" : `A practitioner working on dependable AI systems at ${["Northstar", "Kindred", "Fieldnote", "Signal House", "Orbit", "Tern", "Common Thread", "Lumen", "Civic Lab", "Mosaic"][index]}.`,
    links: [`https://example.test/speakers/${number}`],
    ...(missingHeadshot ? {} : { headshotFileId: `file-headshot-${number}` }),
    ...(missingSlides ? {} : { slidesFileId: `file-slides-${number}` }),
    status: "active",
    public: number <= 8,
    createdAt: "2026-07-12T12:00:00.000Z",
    updatedAt: "2026-08-08T10:00:00.000Z",
  };
});

const sessions: Session[] = submissions.slice(0, 8).map((submission, index) => {
  const route = submission.route;
  const primarySpeakerId = submission.primarySpeakerId as Id;
  return {
    id: `session-${String(index + 1).padStart(2, "0")}`,
    eventId: DEMO_EVENT_ID,
    submissionId: submission.id,
    title: submission.title,
    description: submission.description,
    speakerIds: [primarySpeakerId, ...submission.coSpeakerIds],
    coSpeakerIds: [...submission.coSpeakerIds],
    trackId: route?.trackId ?? tracks[index % tracks.length].id,
    categoryId: route?.categoryId ?? "category-platform",
    status: "accepted",
    public: index < 7,
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-08T11:00:00.000Z",
  };
});

const evaluationAssignments: EvaluationAssignment[] = [
  { id: "assignment-review-01", roundId: "evaluation-round-1", submissionId: "submission-01", evaluatorId: "evaluator-01", status: "submitted" },
  { id: "assignment-review-02", roundId: "evaluation-round-1", submissionId: "submission-01", evaluatorId: "evaluator-02", status: "abstained" },
  { id: "assignment-review-03", roundId: "evaluation-round-1", submissionId: "submission-02", evaluatorId: "evaluator-03", status: "submitted" },
  { id: "assignment-review-04", roundId: "evaluation-round-2", submissionId: "submission-01", evaluatorId: "evaluator-03", status: "assigned" },
];

const reviews: Review[] = [
  {
    id: "review-01",
    roundId: "evaluation-round-1",
    submissionId: "submission-01",
    evaluatorId: "evaluator-01",
    status: "submitted",
    scores: {
      "criterion-usefulness": 5,
      "criterion-technical": 4,
      "criterion-originality": 4,
      "criterion-clarity": 5,
      "criterion-feasibility": 4,
    },
    feedback: "Clear workshop promise with a concrete operational payoff.",
    submittedAt: "2026-08-03T16:00:00.000Z",
  },
  {
    id: "review-02",
    roundId: "evaluation-round-1",
    submissionId: "submission-01",
    evaluatorId: "evaluator-02",
    status: "abstained",
    abstained: true,
    abstentionReason: "Worked with the submitter on the underlying project.",
    scores: {
      "criterion-usefulness": 0,
      "criterion-technical": 0,
      "criterion-originality": 0,
      "criterion-clarity": 0,
      "criterion-feasibility": 0,
    },
  },
  {
    id: "review-03",
    roundId: "evaluation-round-1",
    submissionId: "submission-02",
    evaluatorId: "evaluator-03",
    status: "submitted",
    scores: {
      "criterion-usefulness": 4,
      "criterion-technical": 5,
      "criterion-originality": 4,
      "criterion-clarity": 4,
      "criterion-feasibility": 5,
    },
    feedback: "Strong fit for the product systems track.",
    submittedAt: "2026-08-04T16:00:00.000Z",
  },
];

const tasks: Task[] = [
  {
    id: "task-bio",
    eventId: DEMO_EVENT_ID,
    title: "Confirm your speaker bio",
    description: "Give attendees a short, accurate introduction.",
    kind: "bio",
    required: true,
    dueAt: "2026-08-05T23:59:00-04:00",
    target: { kind: "allAccepted" },
  },
  {
    id: "task-headshot",
    eventId: DEMO_EVENT_ID,
    title: "Upload a headshot",
    description: "Use a clear square image for the public gallery.",
    kind: "headshot",
    required: true,
    dueAt: "2026-08-20T23:59:00-04:00",
    target: { kind: "allAccepted" },
  },
  {
    id: "task-slides",
    eventId: DEMO_EVENT_ID,
    title: "Upload presentation slides",
    description: "Slides remain private until the organizer publishes them.",
    kind: "slides",
    required: true,
    dueAt: "2026-08-06T23:59:00-04:00",
    target: { kind: "allAccepted" },
  },
  {
    id: "task-speaker-details",
    eventId: DEMO_EVENT_ID,
    title: "Complete speaker details",
    description: "Confirm your title, company, links, and contact details.",
    kind: "portalForm",
    required: true,
    dueAt: "2026-08-22T23:59:00-04:00",
    target: { kind: "allAccepted" },
    linkedFormId: "portal-form-speaker-details",
  },
  {
    id: "task-supporting-document",
    eventId: DEMO_EVENT_ID,
    title: "Share supporting material",
    description: "Optional reading or a private handout for the production team.",
    kind: "supportingDocument",
    required: false,
    dueAt: "2026-08-25T23:59:00-04:00",
    target: { kind: "allAccepted" },
  },
  {
    id: "task-tech-check",
    eventId: DEMO_EVENT_ID,
    title: "Book a technical check",
    description: "Choose a slot with the production team.",
    kind: "external",
    required: false,
    dueAt: "2026-09-10T23:59:00-04:00",
    target: { kind: "track", trackId: "track-safety" },
    externalUrl: "https://example.test/tech-check",
  },
];

function taskAssignment(
  id: string,
  taskId: string,
  speaker: number,
  status: TaskAssignment["status"],
  completedAt?: string,
): TaskAssignment {
  return {
    id,
    taskId,
    speakerId: speakerId(speaker),
    status,
    ...(completedAt ? { completedAt } : {}),
  };
}

const taskAssignments: TaskAssignment[] = [
  taskAssignment("task-assignment-01", "task-bio", 1, "completed", "2026-08-02T12:00:00.000Z"),
  taskAssignment("task-assignment-02", "task-headshot", 1, "completed", "2026-08-02T12:00:00.000Z"),
  taskAssignment("task-assignment-03", "task-slides", 1, "completed", "2026-08-02T12:00:00.000Z"),
  taskAssignment("task-assignment-04", "task-speaker-details", 1, "completed", "2026-08-02T12:00:00.000Z"),
  taskAssignment("task-assignment-05", "task-headshot", 2, "pending"),
  taskAssignment("task-assignment-06", "task-slides", 3, "pending"),
  taskAssignment("task-assignment-07", "task-bio", 4, "pending"),
  taskAssignment("task-assignment-08", "task-speaker-details", 5, "completed", "2026-08-04T12:00:00.000Z"),
  taskAssignment("task-assignment-09", "task-supporting-document", 6, "pending"),
];

const portalForms: PortalForm[] = [
  {
    id: "portal-form-speaker-details",
    eventId: DEMO_EVENT_ID,
    title: "Speaker details",
    description: "Confirm the details shown to the event team.",
    sessionLevel: false,
    required: true,
  },
  {
    id: "portal-form-session-requirements",
    eventId: DEMO_EVENT_ID,
    title: "Session requirements",
    description: "Tell production what the session needs.",
    sessionLevel: true,
    required: true,
  },
  {
    id: "portal-form-accessibility",
    eventId: DEMO_EVENT_ID,
    title: "Accessibility check",
    description: "Share accessibility considerations for the room and materials.",
    sessionLevel: true,
    required: false,
  },
];

const portalFormResults: PortalFormResult[] = [
  {
    id: "portal-result-01",
    formId: "portal-form-speaker-details",
    speakerId: speakerId(1),
    answers: { pronouns: "they/them", accessibilityNeeds: "None" },
    status: "submitted",
    submittedAt: "2026-08-02T12:00:00.000Z",
  },
  {
    id: "portal-result-02",
    formId: "portal-form-speaker-details",
    speakerId: speakerId(2),
    answers: { pronouns: "she/her" },
    status: "draft",
  },
];

const resourcePages: ResourcePage[] = [
  {
    id: "resource-speaker-guide",
    eventId: DEMO_EVENT_ID,
    title: "Speaker guide",
    slug: "speaker-guide",
    body: "A short guide to timing, rooms, and the day-of run of show.",
    audience: "speakers",
    published: true,
  },
  {
    id: "resource-production-checklist",
    eventId: DEMO_EVENT_ID,
    title: "Production checklist",
    slug: "production-checklist",
    body: "The organizer's checklist for a calm speaker handoff.",
    audience: "all",
    published: true,
  },
];

const reminders: ScheduledReminder[] = [
  {
    id: "reminder-01",
    eventId: DEMO_EVENT_ID,
    title: "Missing materials reminder",
    taskId: "task-slides",
    scheduledFor: "2026-08-12T14:00:00-04:00",
    status: "scheduled",
    recipientFilter: "incompleteRequiredWork",
  },
  {
    id: "reminder-02",
    eventId: DEMO_EVENT_ID,
    title: "Final speaker details reminder",
    taskId: "task-speaker-details",
    scheduledFor: "2026-08-19T14:00:00-04:00",
    status: "scheduled",
    recipientFilter: "incompleteRequiredWork",
  },
];

const communicationTemplates: CommunicationTemplate[] = [
  {
    id: "template-acceptance",
    eventId: DEMO_EVENT_ID,
    name: "Acceptance",
    subject: "You are on the program for {{eventName}}",
    body: "Hi {{speakerName}}, your session {{sessionTitle}} has been accepted.",
    kind: "acceptance",
  },
  {
    id: "template-reminder",
    eventId: DEMO_EVENT_ID,
    name: "Missing work reminder",
    subject: "A few speaker tasks remain for {{eventName}}",
    body: "Please complete {{outstandingTaskList}} by {{dueDate}}.",
    kind: "reminder",
  },
];

const scheduleEntries: ScheduleEntry[] = [
  {
    id: "schedule-01",
    eventId: DEMO_EVENT_ID,
    sessionId: "session-01",
    roomId: "room-harbor",
    startsAt: "2026-09-17T10:00:00-04:00",
    endsAt: "2026-09-17T11:00:00-04:00",
    speakerIds: [speakerId(1), speakerId(9)],
    moderatorIds: [],
  },
  {
    id: "schedule-02",
    eventId: DEMO_EVENT_ID,
    sessionId: "session-02",
    roomId: "room-harbor",
    startsAt: "2026-09-17T10:30:00-04:00",
    endsAt: "2026-09-17T11:30:00-04:00",
    speakerIds: [speakerId(2), speakerId(10)],
    moderatorIds: [],
  },
  {
    id: "schedule-03",
    eventId: DEMO_EVENT_ID,
    sessionId: "session-03",
    roomId: "room-workshop",
    startsAt: "2026-09-17T13:00:00-04:00",
    endsAt: "2026-09-17T14:00:00-04:00",
    speakerIds: [speakerId(3)],
    moderatorIds: [],
  },
  {
    id: "schedule-04",
    eventId: DEMO_EVENT_ID,
    sessionId: "session-04",
    roomId: "room-studio",
    startsAt: "2026-09-17T13:30:00-04:00",
    endsAt: "2026-09-17T14:30:00-04:00",
    speakerIds: [speakerId(4), speakerId(3)],
    moderatorIds: [],
  },
  {
    id: "schedule-05",
    eventId: DEMO_EVENT_ID,
    sessionId: "session-05",
    roomId: "room-forum",
    startsAt: "2026-09-18T10:00:00-04:00",
    endsAt: "2026-09-18T11:00:00-04:00",
    speakerIds: [speakerId(5)],
    moderatorIds: [],
  },
  {
    id: "schedule-06",
    eventId: DEMO_EVENT_ID,
    sessionId: "session-06",
    roomId: "room-workshop",
    startsAt: "2026-09-18T10:00:00-04:00",
    endsAt: "2026-09-18T11:00:00-04:00",
    speakerIds: [speakerId(6)],
    moderatorIds: [],
  },
  {
    id: "schedule-07",
    eventId: DEMO_EVENT_ID,
    sessionId: "session-07",
    roomId: "room-studio",
    startsAt: "2026-09-18T14:00:00-04:00",
    endsAt: "2026-09-18T15:00:00-04:00",
    speakerIds: [speakerId(7)],
    moderatorIds: [],
  },
];

const demoAccess: DemoAccess[] = [
  { role: "admin", label: "Admin demo", path: "/demo/admin", enabled: true },
  { role: "evaluator", label: "Evaluator demo", path: "/demo/evaluator", enabled: true },
  { role: "speaker", label: "Speaker demo", path: "/demo/speaker", enabled: true },
];

const auditEntries: AuditEntry[] = [
  {
    id: "audit-seed",
    eventId: DEMO_EVENT_ID,
    action: "demo.seeded",
    entityType: "event",
    entityId: DEMO_EVENT_ID,
    actorId: "system-demo",
    createdAt: DEMO_NOW,
    details: { namespace: DEMO_NAMESPACE, resettable: true },
  },
];

export function assertSeedCounts(state: AppState): void {
  // These are the exact demo contract counts from the supplied competition brief.
  // Keeping the assertions here makes accidental seed drift fail at reset time
  // instead of producing a misleadingly incomplete judge journey.
  const acceptedSubmissions = state.submissions.filter((submission) => submission.status === "accepted");
  const scheduledSessionIds = new Set(state.scheduleEntries.map((entry) => entry.sessionId));
  const coSpeakerRelationships = state.submissions.reduce((count, submission) => count + submission.coSpeakerIds.length, 0);
  const roomConflicts = state.conflicts.filter((conflict) => conflict.kind === "room");
  const speakerConflicts = state.conflicts.filter((conflict) => conflict.kind === "speaker");

  const checks: Array<[string, boolean]> = [
    ["two event days", new Set([state.events[0]?.startsAt.slice(0, 10), state.events[0]?.endsAt.slice(0, 10)]).size === 2],
    ["three tracks", state.tracks.length === 3],
    ["four rooms", state.rooms.length === 4],
    ["twelve submissions", state.submissions.length === 12],
    ["ten speakers", state.speakers.length === 10],
    ["three co-speaker relationships", coSpeakerRelationships === 3],
    ["three evaluators", state.evaluators.length === 3],
    ["two evaluation rounds", state.evaluationRounds.length === 2],
    ["five rubric criteria", state.rubricCriteria.length === 5],
    ["eight accepted sessions", acceptedSubmissions.length === 8 && state.sessions.length === 8],
    ["three waitlisted submissions", state.submissions.filter((submission) => submission.status === "waitlisted").length === 3],
    ["one declined submission", state.submissions.filter((submission) => submission.status === "declined").length === 1],
    ["six onboarding tasks", state.tasks.length === 6],
    ["three portal forms", state.portalForms.length === 3],
    ["two resource pages", state.resourcePages.length === 2],
    ["two scheduled reminders", state.reminders.length === 2],
    ["one deliberate room conflict", roomConflicts.length === 1],
    ["one deliberate speaker conflict", speakerConflicts.length === 1],
    ["one unscheduled accepted session", state.sessions.filter((session) => !scheduledSessionIds.has(session.id)).length === 1],
  ];

  const failed = checks.filter(([, passing]) => !passing).map(([label]) => label);
  if (failed.length > 0) {
    throw new Error(`Demo seed contract failed: ${failed.join(", ")}.`);
  }
}

/** Return a fresh, deterministic copy of the canonical demo state. */
export function seedDemoState(): AppState {
  const state: AppState = {
    schemaVersion: 1,
    namespace: DEMO_NAMESPACE,
    revision: 1,
    updatedAt: DEMO_NOW,
    events: [event],
    categories,
    tracks,
    rooms,
    submissionForms: [submissionForm],
    routingRules,
    submissions,
    speakers,
    sessions,
    evaluators,
    evaluationPlans: [evaluationPlan],
    evaluationRounds,
    rubricCriteria,
    evaluationAssignments,
    reviews,
    tasks,
    taskAssignments,
    portalForms,
    portalFormResults,
    resourcePages,
    reminders,
    scheduleEntries,
    conflicts: detectScheduleConflicts(scheduleEntries, { startsAt: eventStartsAt, endsAt: eventEndsAt }),
    communicationTemplates,
    deliveryLogs: [],
    integrationMappings: [],
    auditEntries,
    demoAccess,
  };

  assertSeedCounts(state);

  // JSON cloning avoids sharing mutable nested arrays between reset calls.
  return JSON.parse(JSON.stringify(state)) as AppState;
}

export const createDemoSeed = seedDemoState;
export const createSeedState = seedDemoState;

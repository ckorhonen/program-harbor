/**
 * Shared, JSON-safe domain types for Program Harbor.
 *
 * These types deliberately describe the product rather than any particular
 * persistence provider. Route handlers can map them to D1, Airtable, or the
 * local file adapter without making the domain rules provider-aware.
 */

export type Id = string;
export type IsoDate = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type AnswerValue = JsonValue;
export type AnswerMap = Record<string, AnswerValue | undefined>;

export type FormFieldType =
  | "shortText"
  | "longText"
  | "email"
  | "url"
  | "number"
  | "singleSelect"
  | "multiSelect"
  | "radio"
  | "checkbox"
  | "file"
  | "section"
  | "content";

export type ConditionalOperator =
  | "equals"
  | "notEquals"
  | "in"
  | "notIn"
  | "contains"
  | "notContains"
  | "exists"
  | "notExists";

export interface ConditionalRule {
  fieldKey: string;
  operator: ConditionalOperator;
  value?: AnswerValue | AnswerValue[];
}

export interface FormFieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  allowedFileTypes?: string[];
  maxFileSizeBytes?: number;
}

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: Id;
  key: string;
  label: string;
  type: FormFieldType;
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  /** All rules must match unless `visibilityMode` is set to `any`. */
  visibility?: ConditionalRule[];
  visibilityMode?: "all" | "any";
  /** Conditional requiredness is evaluated only after visibility. */
  requiredWhen?: ConditionalRule[];
  mapping?: "speaker" | "session" | "submission";
}

export type FormStatus = "draft" | "published" | "archived";

export interface SubmissionForm {
  id: Id;
  eventId: Id;
  title: string;
  description: string;
  version: number;
  status: FormStatus;
  shareSlug: string;
  fields: FormField[];
  routingRuleIds: Id[];
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface RoutingTarget {
  categoryId?: Id;
  trackId?: Id;
  evaluationPlanId?: Id;
  reviewQueue?: string;
  tags?: string[];
}

export interface RoutingRule {
  id: Id;
  eventId: Id;
  name: string;
  /** Higher priority wins; ties are resolved by stable rule ID. */
  priority: number;
  conditions: ConditionalRule[];
  target: RoutingTarget;
  enabled: boolean;
}

export interface RoutingDecision extends RoutingTarget {
  source: "rule" | "fallback";
  matchedRuleIds: Id[];
  conflictRuleIds: Id[];
  reason: string;
}

export type EventStatus = "draft" | "published" | "archived";

export interface EventBranding {
  accentColor: string;
  logoUrl?: string;
}

export interface Event {
  id: Id;
  name: string;
  slug: string;
  description: string;
  timezone: string;
  startsAt: IsoDate;
  endsAt: IsoDate;
  status: EventStatus;
  branding: EventBranding;
  defaultSessionDurationMinutes: number;
  submissionStatuses: SubmissionStatus[];
  demoMode: boolean;
}

export interface Category {
  id: Id;
  eventId: Id;
  name: string;
  slug: string;
  color: string;
}

export interface Track {
  id: Id;
  eventId: Id;
  name: string;
  color: string;
}

export interface Room {
  id: Id;
  eventId: Id;
  name: string;
  capacity: number;
}

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "waitlisted"
  | "declined"
  | "withdrawn";

export interface Submission {
  id: Id;
  eventId: Id;
  formId: Id;
  formVersion: number;
  idempotencyKey: string;
  title: string;
  description: string;
  answers: AnswerMap;
  primarySpeakerId?: Id;
  coSpeakerIds: Id[];
  supportingFile?: StoredFile;
  route?: RoutingDecision;
  status: SubmissionStatus;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface StoredFile {
  id: Id;
  name: string;
  size: number;
  type: string;
  private: boolean;
}

export type SpeakerStatus = "active" | "inactive";

export interface Speaker {
  id: Id;
  eventId: Id;
  email: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  links: string[];
  headshotFileId?: Id;
  slidesFileId?: Id;
  status: SpeakerStatus;
  public: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export type SessionStatus = "draft" | "accepted" | "published" | "cancelled";

export interface Session {
  id: Id;
  eventId: Id;
  submissionId: Id;
  title: string;
  description: string;
  speakerIds: Id[];
  coSpeakerIds: Id[];
  trackId: Id;
  categoryId: Id;
  status: SessionStatus;
  public: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface Evaluator {
  id: Id;
  eventId: Id;
  name: string;
  email: string;
}

export interface EvaluationRound {
  id: Id;
  evaluationPlanId: Id;
  name: string;
  order: number;
  opensAt: IsoDate;
  closesAt: IsoDate;
}

export interface RubricCriterion {
  id: Id;
  evaluationPlanId: Id;
  key: string;
  label: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface EvaluationAssignment {
  id: Id;
  roundId: Id;
  submissionId: Id;
  evaluatorId: Id;
  status: "assigned" | "started" | "submitted" | "abstained";
}

export type ReviewStatus = "draft" | "submitted" | "abstained";

export interface Review {
  id: Id;
  roundId: Id;
  submissionId: Id;
  evaluatorId: Id;
  status: ReviewStatus;
  abstained?: boolean;
  abstentionReason?: string;
  scores: Record<Id, number | null>;
  feedback?: string;
  submittedAt?: IsoDate;
}

export interface EvaluationPlan {
  id: Id;
  eventId: Id;
  name: string;
  instructions: string;
  blindReview: boolean;
  allowConflictsOfInterest: boolean;
  roundIds: Id[];
  criterionIds: Id[];
}

export type TaskKind =
  | "bio"
  | "headshot"
  | "slides"
  | "supportingDocument"
  | "portalForm"
  | "external"
  | "general";

export type TaskAssignmentStatus = "pending" | "completed" | "rejected";

export type TaskTarget =
  | { kind: "allAccepted" }
  | { kind: "category"; categoryId: Id }
  | { kind: "track"; trackId: Id }
  | { kind: "speakers"; speakerIds: Id[] };

export interface Task {
  id: Id;
  eventId: Id;
  title: string;
  description: string;
  kind: TaskKind;
  required: boolean;
  dueAt: IsoDate;
  target: TaskTarget;
  linkedFormId?: Id;
  externalUrl?: string;
}

export interface TaskAssignment {
  id: Id;
  taskId: Id;
  speakerId: Id;
  status: TaskAssignmentStatus;
  completedAt?: IsoDate;
  evidence?: string;
}

export interface PortalForm {
  id: Id;
  eventId: Id;
  title: string;
  description: string;
  sessionLevel: boolean;
  required: boolean;
}

export interface PortalFormResult {
  id: Id;
  formId: Id;
  speakerId: Id;
  sessionId?: Id;
  answers: AnswerMap;
  status: "draft" | "submitted";
  submittedAt?: IsoDate;
}

export interface ResourcePage {
  id: Id;
  eventId: Id;
  title: string;
  slug: string;
  body: string;
  audience: "all" | "speakers" | "track";
  trackId?: Id;
  published: boolean;
}

export interface ScheduledReminder {
  id: Id;
  eventId: Id;
  title: string;
  taskId: Id;
  scheduledFor: IsoDate;
  status: "scheduled" | "cancelled" | "sent";
  recipientFilter: "incompleteRequiredWork";
}

export interface ScheduleOverride {
  acknowledged: boolean;
  reason?: string;
  actorId?: Id;
  acknowledgedAt?: IsoDate;
}

export interface ScheduleEntry {
  id: Id;
  eventId: Id;
  sessionId: Id;
  roomId: Id;
  startsAt: IsoDate;
  endsAt: IsoDate;
  speakerIds: Id[];
  moderatorIds: Id[];
  override?: ScheduleOverride;
}

export type ScheduleConflictKind =
  | "room"
  | "speaker"
  | "moderator"
  | "event_bounds"
  | "invalid_duration";

export interface ScheduleConflict {
  id: Id;
  kind: ScheduleConflictKind;
  scheduleEntryIds: Id[];
  resourceId?: Id;
  message: string;
  overridden: boolean;
  overrideReason?: string;
}

export interface CommunicationTemplate {
  id: Id;
  eventId: Id;
  name: string;
  subject: string;
  body: string;
  kind:
    | "submissionConfirmation"
    | "acceptance"
    | "waitlist"
    | "decline"
    | "portalInvitation"
    | "reminder"
    | "scheduleConfirmation"
    | "scheduleUpdate";
}

export interface DeliveryLog {
  id: Id;
  templateId: Id;
  speakerId?: Id;
  status: "queued" | "sent" | "failed";
  createdAt: IsoDate;
  error?: string;
}

export interface IntegrationMapping {
  id: Id;
  provider: "accelevents" | "airtable";
  entityType: "speaker" | "session";
  localId: Id;
  externalId: string;
  updatedAt: IsoDate;
}

export interface AuditEntry {
  id: Id;
  eventId: Id;
  action: string;
  entityType: string;
  entityId: Id;
  actorId: Id;
  createdAt: IsoDate;
  details?: Record<string, JsonValue>;
}

export interface DemoAccess {
  role: "admin" | "evaluator" | "speaker";
  label: string;
  path: string;
  enabled: boolean;
}

export interface AppState {
  schemaVersion: 1;
  namespace: string;
  revision: number;
  updatedAt: IsoDate;
  events: Event[];
  categories: Category[];
  tracks: Track[];
  rooms: Room[];
  submissionForms: SubmissionForm[];
  routingRules: RoutingRule[];
  submissions: Submission[];
  speakers: Speaker[];
  sessions: Session[];
  evaluators: Evaluator[];
  evaluationPlans: EvaluationPlan[];
  evaluationRounds: EvaluationRound[];
  rubricCriteria: RubricCriterion[];
  evaluationAssignments: EvaluationAssignment[];
  reviews: Review[];
  tasks: Task[];
  taskAssignments: TaskAssignment[];
  portalForms: PortalForm[];
  portalFormResults: PortalFormResult[];
  resourcePages: ResourcePage[];
  reminders: ScheduledReminder[];
  scheduleEntries: ScheduleEntry[];
  conflicts: ScheduleConflict[];
  communicationTemplates: CommunicationTemplate[];
  deliveryLogs: DeliveryLog[];
  integrationMappings: IntegrationMapping[];
  auditEntries: AuditEntry[];
  demoAccess: DemoAccess[];
}

export interface OnboardingDeadline {
  taskId: Id;
  assignmentId: Id;
  speakerId: Id;
  title: string;
  dueAt: IsoDate;
}

export interface OnboardingMetrics {
  totalSpeakers: number;
  fullyOnboardedSpeakers: number;
  speakersWithOutstandingWork: number;
  overdueTasks: number;
  missingBios: number;
  missingHeadshots: number;
  missingSlides: number;
  incompleteForms: number;
  completionPercentage: number;
  requiredTaskCount: number;
  completedRequiredTaskCount: number;
  upcomingDeadlines: OnboardingDeadline[];
}

export interface WeightedScoreResult {
  weightedScore: number | null;
  percentage: number | null;
  criterionScores: Record<Id, number | null>;
  scoredCriterionCount: number;
  eligibleReviewCount: number;
  abstainedReviewCount: number;
  totalWeight: number;
}

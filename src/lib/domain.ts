import type {
  AnswerMap,
  ConditionalRule,
  FormField,
  Id,
  OnboardingMetrics,
  OnboardingDeadline,
  Review,
  RoutingDecision,
  RoutingRule,
  RoutingTarget,
  ScheduleConflict,
  ScheduleEntry,
  SubmissionStatus,
  Task,
  TaskAssignment,
  Speaker,
  PortalFormResult,
  RubricCriterion,
  WeightedScoreResult,
} from "./types";

export interface ConditionalEvaluation {
  answers: AnswerMap;
  visibleFieldKeys: string[];
  hiddenFieldKeys: string[];
  requiredFieldKeys: string[];
  missingRequiredKeys: string[];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }

  return value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function isEmptyAnswer(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function expectedValues(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function containsValue(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(actual)) {
    if (Array.isArray(expected)) {
      return expected.every((item) => actual.some((candidate) => valuesEqual(candidate, item)));
    }
    return actual.some((candidate) => valuesEqual(candidate, expected));
  }

  if (typeof actual === "string" && typeof expected === "string") {
    return actual.includes(expected);
  }

  return false;
}

/** Evaluate one conditional expression against the current answer map. */
export function matchesConditionalRule(rule: ConditionalRule, answers: Record<string, unknown>): boolean {
  const actual = answers[rule.fieldKey];
  const expected = rule.value;

  switch (rule.operator) {
    case "equals":
      return valuesEqual(actual, expected);
    case "notEquals":
      return !valuesEqual(actual, expected);
    case "in":
      return expectedValues(expected).some((candidate) => valuesEqual(actual, candidate));
    case "notIn":
      return !expectedValues(expected).some((candidate) => valuesEqual(actual, candidate));
    case "contains":
      return containsValue(actual, expected);
    case "notContains":
      return !containsValue(actual, expected);
    case "exists":
      return !isEmptyAnswer(actual);
    case "notExists":
      return isEmptyAnswer(actual);
  }
}

function matchesRules(
  rules: ConditionalRule[] | undefined,
  answers: Record<string, unknown>,
  mode: "all" | "any" = "all",
): boolean {
  if (!rules || rules.length === 0) {
    return true;
  }

  return mode === "any"
    ? rules.some((rule) => matchesConditionalRule(rule, answers))
    : rules.every((rule) => matchesConditionalRule(rule, answers));
}

export function isFieldVisible(field: FormField, answers: Record<string, unknown>): boolean {
  return matchesRules(field.visibility, answers, field.visibilityMode ?? "all");
}

export function isFieldRequired(field: FormField, answers: Record<string, unknown>): boolean {
  return Boolean(field.required) || matchesRules(field.requiredWhen, answers);
}

/**
 * Evaluate a form on the server boundary. Unknown keys, content-only fields,
 * and answers belonging to hidden fields are dropped before persistence.
 */
export function evaluateConditionalAnswers(
  fields: FormField[],
  submittedAnswers: Record<string, unknown>,
): ConditionalEvaluation {
  const answers: AnswerMap = {};
  const visibleFieldKeys: string[] = [];
  const hiddenFieldKeys: string[] = [];
  const requiredFieldKeys: string[] = [];

  for (const field of fields) {
    const visible = isFieldVisible(field, submittedAnswers);
    if (!visible) {
      hiddenFieldKeys.push(field.key);
      continue;
    }

    visibleFieldKeys.push(field.key);
    if (field.type !== "section" && field.type !== "content") {
      if (Object.prototype.hasOwnProperty.call(submittedAnswers, field.key)) {
        const value = submittedAnswers[field.key];
        if (value !== undefined) {
          answers[field.key] = value as AnswerMap[string];
        }
      }

      if (isFieldRequired(field, submittedAnswers)) {
        requiredFieldKeys.push(field.key);
      }
    }
  }

  const missingRequiredKeys = requiredFieldKeys.filter((key) => isEmptyAnswer(answers[key]));

  return {
    answers,
    visibleFieldKeys,
    hiddenFieldKeys,
    requiredFieldKeys,
    missingRequiredKeys,
  };
}

export const evaluateFormAnswers = evaluateConditionalAnswers;

export function dropHiddenAnswers(fields: FormField[], submittedAnswers: Record<string, unknown>): AnswerMap {
  return evaluateConditionalAnswers(fields, submittedAnswers).answers;
}

export function matchesRoutingRule(rule: RoutingRule, answers: Record<string, unknown>): boolean {
  return rule.enabled && matchesRules(rule.conditions, answers);
}

function routingTargetKey(target: RoutingTarget): string {
  return JSON.stringify(stableValue(target));
}

/**
 * Apply routing deterministically. Higher numeric priority wins; rules with
 * equal priority are ordered by ID. All matched rules are returned so the UI
 * can explain a conflict instead of silently hiding it.
 */
export function routeSubmission(
  answers: Record<string, unknown>,
  rules: RoutingRule[],
  fallback: RoutingTarget,
): RoutingDecision {
  const matched = rules
    .filter((rule) => matchesRoutingRule(rule, answers))
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));

  if (matched.length === 0) {
    return {
      ...fallback,
      tags: fallback.tags ? [...fallback.tags] : undefined,
      source: "fallback",
      matchedRuleIds: [],
      conflictRuleIds: [],
      reason: "No routing rule matched; the default route was selected.",
    };
  }

  const winner = matched[0];
  const conflictRuleIds = matched
    .slice(1)
    .filter((rule) => routingTargetKey(rule.target) !== routingTargetKey(winner.target))
    .map((rule) => rule.id);

  return {
    ...winner.target,
    tags: winner.target.tags ? [...winner.target.tags] : undefined,
    source: "rule",
    matchedRuleIds: matched.map((rule) => rule.id),
    conflictRuleIds,
    reason:
      conflictRuleIds.length > 0
        ? `Rule ${winner.id} won by priority; ${conflictRuleIds.length} lower-priority conflicting rule(s) were recorded.`
        : `Rule ${winner.id} matched.`,
  };
}

export const determineRouting = routeSubmission;

function isAbstainedReview(review: Review): boolean {
  return Boolean(review.abstained) || review.status === "abstained";
}

/**
 * Compute a weighted average by first averaging each criterion across eligible
 * reviews. Draft and abstained reviews contribute no score and never become a
 * zero that drags down the aggregate.
 */
export function calculateWeightedReviewScore(
  criteria: RubricCriterion[],
  reviews: Review[],
): WeightedScoreResult {
  const criterionScores: Record<Id, number | null> = {};
  const eligibleReviews = reviews.filter((review) => review.status !== "draft" && !isAbstainedReview(review));
  const abstainedReviewCount = reviews.filter(isAbstainedReview).length;
  let totalWeight = 0;
  let weightedScoreTotal = 0;
  let percentageTotal = 0;
  let scoredCriterionCount = 0;

  for (const criterion of criteria) {
    if (!Number.isFinite(criterion.weight) || criterion.weight < 0) {
      throw new RangeError(`Criterion ${criterion.id} must have a non-negative finite weight.`);
    }
    if (!Number.isFinite(criterion.maxScore) || criterion.maxScore <= 0) {
      throw new RangeError(`Criterion ${criterion.id} must have a positive finite max score.`);
    }

    const scores = eligibleReviews
      .map((review) => review.scores[criterion.id])
      .filter((score): score is number => typeof score === "number" && Number.isFinite(score));

    if (scores.length === 0) {
      criterionScores[criterion.id] = null;
      continue;
    }

    for (const score of scores) {
      if (score < 0 || score > criterion.maxScore) {
        throw new RangeError(`Score for criterion ${criterion.id} must be between 0 and ${criterion.maxScore}.`);
      }
    }

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    criterionScores[criterion.id] = average;
    scoredCriterionCount += 1;
    totalWeight += criterion.weight;
    weightedScoreTotal += average * criterion.weight;
    percentageTotal += (average / criterion.maxScore) * 100 * criterion.weight;
  }

  return {
    weightedScore: totalWeight > 0 ? weightedScoreTotal / totalWeight : null,
    percentage: totalWeight > 0 ? percentageTotal / totalWeight : null,
    criterionScores,
    scoredCriterionCount,
    eligibleReviewCount: eligibleReviews.length,
    abstainedReviewCount,
    totalWeight,
  };
}

export const calculateWeightedScore = calculateWeightedReviewScore;

const allowedSubmissionTransitions: Record<SubmissionStatus, readonly SubmissionStatus[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["under_review", "accepted", "waitlisted", "declined", "withdrawn"],
  under_review: ["accepted", "waitlisted", "declined", "withdrawn"],
  accepted: ["withdrawn"],
  waitlisted: ["accepted", "declined", "withdrawn"],
  declined: ["withdrawn"],
  withdrawn: [],
};

export function allowedStatusTransitions(current: SubmissionStatus): SubmissionStatus[] {
  return [...allowedSubmissionTransitions[current]];
}

export function canTransitionSubmissionStatus(current: SubmissionStatus, next: SubmissionStatus): boolean {
  return current === next || allowedSubmissionTransitions[current].includes(next);
}

export const canTransitionStatus = canTransitionSubmissionStatus;

export class InvalidSubmissionStatusTransitionError extends Error {
  constructor(current: SubmissionStatus, next: SubmissionStatus) {
    super(`Cannot transition submission from ${current} to ${next}.`);
    this.name = "InvalidSubmissionStatusTransitionError";
  }
}

export function transitionSubmissionStatus(current: SubmissionStatus, next: SubmissionStatus): SubmissionStatus {
  if (!canTransitionSubmissionStatus(current, next)) {
    throw new InvalidSubmissionStatusTransitionError(current, next);
  }
  return next;
}

export const transitionStatus = transitionSubmissionStatus;

export function completeTaskAssignment(assignment: TaskAssignment, completedAt: string): TaskAssignment {
  if (assignment.status === "rejected") {
    throw new Error(`Rejected task assignment ${assignment.id} cannot be completed.`);
  }

  return {
    ...assignment,
    status: "completed",
    completedAt,
  };
}

export function completeTask(
  assignments: TaskAssignment[],
  taskId: Id,
  speakerId: Id,
  completedAt = new Date().toISOString(),
): TaskAssignment[] {
  let found = false;
  const updated = assignments.map((assignment) => {
    if (assignment.taskId !== taskId || assignment.speakerId !== speakerId) {
      return assignment;
    }
    found = true;
    return completeTaskAssignment(assignment, completedAt);
  });

  if (!found) {
    throw new Error(`Task assignment for task ${taskId} and speaker ${speakerId} was not found.`);
  }

  return updated;
}

export interface OnboardingMetricsOptions {
  asOf?: string | Date;
}

function asOfIso(options: OnboardingMetricsOptions): string {
  return options.asOf instanceof Date ? options.asOf.toISOString() : options.asOf ?? new Date().toISOString();
}

function profileIsComplete(speaker: Speaker): boolean {
  return Boolean(speaker.bio.trim() && speaker.headshotFileId && speaker.slidesFileId);
}

function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Calculate dashboard counts from persisted speaker/task records. */
export function calculateOnboardingMetrics(
  speakers: Speaker[],
  tasks: Task[],
  assignments: TaskAssignment[],
  formResults: PortalFormResult[] = [],
  options: OnboardingMetricsOptions = {},
): OnboardingMetrics {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const speakerIds = new Set(speakers.map((speaker) => speaker.id));
  const speakerAssignments = new Map<Id, TaskAssignment[]>();
  for (const assignment of assignments) {
    if (!speakerIds.has(assignment.speakerId)) {
      continue;
    }
    const existing = speakerAssignments.get(assignment.speakerId) ?? [];
    existing.push(assignment);
    speakerAssignments.set(assignment.speakerId, existing);
  }

  const asOf = asOfIso(options);
  const allRequiredAssignments = assignments.filter((assignment) => {
    const task = taskById.get(assignment.taskId);
    return Boolean(task?.required && speakerIds.has(assignment.speakerId));
  });
  const completedRequiredTaskCount = allRequiredAssignments.filter((assignment) => assignment.status === "completed").length;
  const overdueTasks = assignments.filter((assignment) => {
    const task = taskById.get(assignment.taskId);
    return Boolean(task && assignment.status !== "completed" && task.dueAt < asOf);
  }).length;

  const fullyOnboardedSpeakers = speakers.filter((speaker) => {
    const required = (speakerAssignments.get(speaker.id) ?? []).filter((assignment) => taskById.get(assignment.taskId)?.required);
    return profileIsComplete(speaker) && required.every((assignment) => assignment.status === "completed");
  }).length;

  const incompleteForms = assignments.filter((assignment) => {
    const task = taskById.get(assignment.taskId);
    if (!task || task.kind !== "portalForm" || assignment.status === "completed") {
      return false;
    }
    return true;
  }).length + formResults.filter((result) => result.status !== "submitted").length;

  const upcomingDeadlines: OnboardingDeadline[] = assignments
    .filter((assignment) => assignment.status !== "completed")
    .flatMap((assignment) => {
      const task = taskById.get(assignment.taskId);
      if (!task || task.dueAt < asOf) {
        return [];
      }
      return [
        {
          taskId: task.id,
          assignmentId: assignment.id,
          speakerId: assignment.speakerId,
          title: task.title,
          dueAt: task.dueAt,
        },
      ];
    })
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt) || left.assignmentId.localeCompare(right.assignmentId));

  const requiredTaskCount = allRequiredAssignments.length;
  const completionPercentage =
    requiredTaskCount > 0
      ? roundPercentage((completedRequiredTaskCount / requiredTaskCount) * 100)
      : speakers.length > 0
        ? roundPercentage((fullyOnboardedSpeakers / speakers.length) * 100)
        : 100;

  return {
    totalSpeakers: speakers.length,
    fullyOnboardedSpeakers,
    speakersWithOutstandingWork: speakers.length - fullyOnboardedSpeakers,
    overdueTasks,
    missingBios: speakers.filter((speaker) => !speaker.bio.trim()).length,
    missingHeadshots: speakers.filter((speaker) => !speaker.headshotFileId).length,
    missingSlides: speakers.filter((speaker) => !speaker.slidesFileId).length,
    incompleteForms,
    completionPercentage,
    requiredTaskCount,
    completedRequiredTaskCount,
    upcomingDeadlines,
  };
}

export function intervalsOverlap(
  leftStartsAt: string,
  leftEndsAt: string,
  rightStartsAt: string,
  rightEndsAt: string,
): boolean {
  const leftStart = Date.parse(leftStartsAt);
  const leftEnd = Date.parse(leftEndsAt);
  const rightStart = Date.parse(rightStartsAt);
  const rightEnd = Date.parse(rightEndsAt);

  if (![leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)) {
    return false;
  }

  // Half-open intervals mean 10:00-11:00 and 11:00-12:00 do not conflict.
  return leftStart < rightEnd && rightStart < leftEnd;
}

function validInterval(entry: ScheduleEntry): boolean {
  const startsAt = Date.parse(entry.startsAt);
  const endsAt = Date.parse(entry.endsAt);
  return Number.isFinite(startsAt) && Number.isFinite(endsAt) && endsAt > startsAt;
}

function explicitOverride(entries: ScheduleEntry[]): { overridden: boolean; reason?: string } {
  const override = entries.find(
    (entry) => entry.override?.acknowledged && Boolean(entry.override.reason?.trim()),
  )?.override;
  return {
    overridden: Boolean(override),
    reason: override?.reason,
  };
}

function pairKey(left: ScheduleEntry, right: ScheduleEntry): [ScheduleEntry, ScheduleEntry] {
  return left.id.localeCompare(right.id) <= 0 ? [left, right] : [right, left];
}

function makePairConflict(
  kind: "room" | "speaker" | "moderator",
  left: ScheduleEntry,
  right: ScheduleEntry,
  resourceId: Id,
): ScheduleConflict {
  const [first, second] = pairKey(left, right);
  const override = explicitOverride([first, second]);
  const label = kind === "room" ? "Room" : kind === "speaker" ? "Speaker" : "Moderator";
  return {
    id: `conflict-${kind}-${first.id}-${second.id}-${resourceId}`,
    kind,
    scheduleEntryIds: [first.id, second.id],
    resourceId,
    message: `${label} ${resourceId} is scheduled for overlapping sessions ${first.sessionId} and ${second.sessionId}.`,
    overridden: override.overridden,
    overrideReason: override.reason,
  };
}

function makeEntryConflict(
  kind: "invalid_duration" | "event_bounds",
  entry: ScheduleEntry,
  message: string,
): ScheduleConflict {
  const override = explicitOverride([entry]);
  return {
    id: `conflict-${kind}-${entry.id}`,
    kind,
    scheduleEntryIds: [entry.id],
    message,
    overridden: override.overridden,
    overrideReason: override.reason,
  };
}

function sharedResource(left: Id[], right: Id[]): Id | undefined {
  const rightIds = new Set(right);
  return [...new Set(left)].filter((id) => rightIds.has(id)).sort((a, b) => a.localeCompare(b))[0];
}

export interface EventBounds {
  startsAt: string;
  endsAt: string;
}

/** Detect schedule conflicts without treating boundary-touching slots as overlap. */
export function detectScheduleConflicts(
  entries: ScheduleEntry[],
  eventBounds?: EventBounds,
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  for (const entry of entries) {
    if (!validInterval(entry)) {
      conflicts.push(
        makeEntryConflict(
          "invalid_duration",
          entry,
          `Session ${entry.sessionId} has an invalid interval; its end must be after its start.`,
        ),
      );
      continue;
    }

    if (eventBounds) {
      const startsAt = Date.parse(entry.startsAt);
      const endsAt = Date.parse(entry.endsAt);
      const boundStart = Date.parse(eventBounds.startsAt);
      const boundEnd = Date.parse(eventBounds.endsAt);
      if (
        Number.isFinite(boundStart) &&
        Number.isFinite(boundEnd) &&
        (startsAt < boundStart || endsAt > boundEnd)
      ) {
        conflicts.push(
          makeEntryConflict(
            "event_bounds",
            entry,
            `Session ${entry.sessionId} falls outside the event time bounds.`,
          ),
        );
      }
    }
  }

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    const left = entries[leftIndex];
    if (!validInterval(left)) {
      continue;
    }

    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const right = entries[rightIndex];
      if (!validInterval(right) || !intervalsOverlap(left.startsAt, left.endsAt, right.startsAt, right.endsAt)) {
        continue;
      }

      if (left.roomId && left.roomId === right.roomId) {
        conflicts.push(makePairConflict("room", left, right, left.roomId));
      }

      const speakerId = sharedResource(left.speakerIds, right.speakerIds);
      if (speakerId) {
        conflicts.push(makePairConflict("speaker", left, right, speakerId));
      }

      const moderatorId = sharedResource(left.moderatorIds, right.moderatorIds);
      if (moderatorId) {
        conflicts.push(makePairConflict("moderator", left, right, moderatorId));
      }
    }
  }

  const conflictOrder: Record<ScheduleConflict["kind"], number> = {
    invalid_duration: 0,
    event_bounds: 1,
    room: 2,
    speaker: 3,
    moderator: 4,
  };
  return conflicts.sort(
    (left, right) => conflictOrder[left.kind] - conflictOrder[right.kind] || left.id.localeCompare(right.id),
  );
}

export const detectConflicts = detectScheduleConflicts;

export function unresolvedScheduleConflicts(conflicts: ScheduleConflict[]): ScheduleConflict[] {
  return conflicts.filter((conflict) => !conflict.overridden);
}

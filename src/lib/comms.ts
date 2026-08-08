/**
 * Framework-neutral communication primitives.
 *
 * These helpers deliberately stop before delivery. Route handlers can render a
 * message, check reminder eligibility, and persist an operation/idempotency
 * key before handing the resulting record to an email provider.
 */

export const TEMPLATE_VARIABLES = {
  speakerName: "The speaker's display name",
  eventName: "The event name",
  sessionTitle: "The accepted session title",
  sessionDate: "The session date in the event timezone",
  sessionTime: "The session time in the event timezone",
  eventTimezone: "The event IANA timezone",
  room: "The session room",
  track: "The session track",
  portalUrl: "The speaker portal URL",
  outstandingTaskList: "The speaker's outstanding task list",
  dueDate: "The relevant task due date",
} as const;

export type TemplateVariable = keyof typeof TEMPLATE_VARIABLES;

export const TEMPLATE_VARIABLE_ALLOWLIST: readonly TemplateVariable[] =
  Object.freeze(Object.keys(TEMPLATE_VARIABLES) as TemplateVariable[]);

// A descriptive alias makes the allowlist easy to discover from route code.
export const ALLOWED_TEMPLATE_VARIABLES = TEMPLATE_VARIABLE_ALLOWLIST;

export type TemplateValue =
  | string
  | number
  | boolean
  | Date
  | readonly (string | number)[];

export type TemplateContext = Partial<Record<TemplateVariable, TemplateValue>>;

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateError";
  }
}

export class UnknownTemplateVariableError extends TemplateError {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    const uniqueVariables = [...new Set(variables)];
    super(`Unknown communication template variable(s): ${uniqueVariables.join(", ")}`);
    this.name = "UnknownTemplateVariableError";
    this.variables = uniqueVariables;
  }
}

export class MissingTemplateValueError extends TemplateError {
  readonly variables: readonly TemplateVariable[];

  constructor(variables: readonly TemplateVariable[]) {
    const uniqueVariables = [...new Set(variables)];
    super(`Missing communication template value(s): ${uniqueVariables.join(", ")}`);
    this.name = "MissingTemplateValueError";
    this.variables = uniqueVariables;
  }
}

export class InvalidTemplateSyntaxError extends TemplateError {
  readonly tokens: readonly string[];

  constructor(tokens: readonly string[]) {
    const uniqueTokens = [...new Set(tokens)];
    super(`Invalid communication template token(s): ${uniqueTokens.join(", ")}`);
    this.name = "InvalidTemplateSyntaxError";
    this.tokens = uniqueTokens;
  }
}

export interface TemplateValidationResult {
  valid: boolean;
  variables: readonly TemplateVariable[];
  unknownVariables: readonly string[];
  invalidTokens: readonly string[];
}

const TEMPLATE_TOKEN = /\{\{([\s\S]*?)\}\}/g;
const TEMPLATE_VARIABLE_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string`);
  }
}

function inspectTemplate(template: string): TemplateValidationResult {
  assertString(template, "template");

  const variables: TemplateVariable[] = [];
  const unknownVariables: string[] = [];
  const invalidTokens: string[] = [];
  let match: RegExpExecArray | null;

  TEMPLATE_TOKEN.lastIndex = 0;
  while ((match = TEMPLATE_TOKEN.exec(template)) !== null) {
    const rawToken = match[0];
    const name = match[1].trim();

    if (!TEMPLATE_VARIABLE_NAME.test(name)) {
      invalidTokens.push(rawToken);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(TEMPLATE_VARIABLES, name)) {
      variables.push(name as TemplateVariable);
    } else {
      unknownVariables.push(name);
    }
  }

  // A dangling delimiter is almost certainly a typo. Reject it instead of
  // silently sending a message containing an unresolved placeholder.
  const openingDelimiters = template.match(/\{\{/g)?.length ?? 0;
  const closingDelimiters = template.match(/\}\}/g)?.length ?? 0;
  if (openingDelimiters !== closingDelimiters) {
    invalidTokens.push(template);
  }

  return {
    valid: unknownVariables.length === 0 && invalidTokens.length === 0,
    variables: [...new Set(variables)],
    unknownVariables: [...new Set(unknownVariables)],
    invalidTokens: [...new Set(invalidTokens)],
  };
}

export function extractTemplateVariables(template: string): readonly TemplateVariable[] {
  const result = inspectTemplate(template);
  if (result.invalidTokens.length > 0) {
    throw new InvalidTemplateSyntaxError(result.invalidTokens);
  }
  if (result.unknownVariables.length > 0) {
    throw new UnknownTemplateVariableError(result.unknownVariables);
  }
  return result.variables;
}

export const getTemplateVariables = extractTemplateVariables;

export function validateTemplateVariables(template: string): TemplateValidationResult {
  return inspectTemplate(template);
}

export function assertTemplateVariablesAllowed(template: string): readonly TemplateVariable[] {
  return extractTemplateVariables(template);
}

function formatTemplateValue(value: TemplateValue): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new TypeError("Template Date values must be valid dates");
    }
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

export function renderTemplate(template: string, context: TemplateContext): string {
  if (!context || typeof context !== "object") {
    throw new TypeError("template context must be an object");
  }
  const validation = inspectTemplate(template);
  if (validation.invalidTokens.length > 0) {
    throw new InvalidTemplateSyntaxError(validation.invalidTokens);
  }
  if (validation.unknownVariables.length > 0) {
    throw new UnknownTemplateVariableError(validation.unknownVariables);
  }

  const missingVariables = validation.variables.filter(
    (variable) => context[variable] === undefined || context[variable] === null,
  );
  if (missingVariables.length > 0) {
    throw new MissingTemplateValueError(missingVariables);
  }

  TEMPLATE_TOKEN.lastIndex = 0;
  return template.replace(TEMPLATE_TOKEN, (_token, rawName: string) => {
    const variable = rawName.trim() as TemplateVariable;
    return formatTemplateValue(context[variable] as TemplateValue);
  });
}

export const renderCommunicationTemplate = renderTemplate;
export const previewTemplate = renderTemplate;

export type ReminderTaskStatus =
  | "pending"
  | "in_progress"
  | "overdue"
  | "completed"
  | "complete"
  | "done"
  | "submitted"
  | "cancelled"
  | "canceled"
  | "skipped";

export interface ReminderTask {
  id?: string;
  required: boolean;
  status?: ReminderTaskStatus | string;
  completedAt?: Date | string | number | null;
  dueAt?: Date | string | number | null;
}

export type ReminderIneligibilityReason =
  | "optional-task"
  | "already-completed"
  | "cancelled-task"
  | "incomplete-required-task";

export interface ReminderEligibilityResult {
  eligible: boolean;
  reason: ReminderIneligibilityReason;
}

const COMPLETED_TASK_STATUSES = new Set(["completed", "complete", "done", "submitted"]);
const CANCELLED_TASK_STATUSES = new Set(["cancelled", "canceled", "skipped"]);

function hasCompletionTimestamp(task: ReminderTask): boolean {
  if (task.completedAt === undefined || task.completedAt === null) {
    return false;
  }
  return task.completedAt instanceof Date || String(task.completedAt).trim().length > 0;
}

export function evaluateReminderEligibility(task: ReminderTask): ReminderEligibilityResult {
  if (task.required === false) {
    return { eligible: false, reason: "optional-task" };
  }

  const normalizedStatus = task.status?.toLowerCase();
  if (hasCompletionTimestamp(task) || (normalizedStatus && COMPLETED_TASK_STATUSES.has(normalizedStatus))) {
    return { eligible: false, reason: "already-completed" };
  }
  if (normalizedStatus && CANCELLED_TASK_STATUSES.has(normalizedStatus)) {
    return { eligible: false, reason: "cancelled-task" };
  }

  return { eligible: true, reason: "incomplete-required-task" };
}

export function isReminderEligible(task: ReminderTask): boolean {
  return evaluateReminderEligibility(task).eligible;
}

export const shouldSendReminder = isReminderEligible;

export function filterReminderEligibleTasks<T extends ReminderTask>(tasks: readonly T[]): T[] {
  return tasks.filter(isReminderEligible);
}

export interface OperationIdentity {
  operation: string;
  resource: string;
  resourceId: string;
  revision?: string | number;
  recipient?: string;
  attempt?: number;
}

function validateOperationIdentity(input: OperationIdentity): void {
  for (const [label, value] of [
    ["operation", input.operation],
    ["resource", input.resource],
    ["resourceId", input.resourceId],
  ] as const) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(`Operation ${label} must be a non-empty string`);
    }
  }
  if (input.revision !== undefined && typeof input.revision !== "string" && typeof input.revision !== "number") {
    throw new TypeError("Operation revision must be a string or number");
  }
  if (typeof input.attempt !== "undefined" && (!Number.isInteger(input.attempt) || input.attempt < 0)) {
    throw new RangeError("Operation attempt must be a non-negative integer");
  }
}

function encodedPart(value: string | number): string {
  return encodeURIComponent(String(value).trim());
}

/**
 * Stable across retries for the same logical message revision and recipient.
 * The key is intentionally readable so a delivery log can explain why a
 * retry was deduplicated without decoding a hash.
 */
export function createIdempotencyKey(input: OperationIdentity): string {
  validateOperationIdentity(input);
  return [
    "program-harbor",
    encodedPart(input.operation),
    encodedPart(input.resource),
    encodedPart(input.resourceId),
    encodedPart(input.revision ?? "0"),
    encodedPart(input.recipient ?? "all"),
  ].join(":");
}

export const buildIdempotencyKey = createIdempotencyKey;
export const idempotencyKeyFor = createIdempotencyKey;

function hashIdentity(input: OperationIdentity): string {
  const values = [
    input.operation.trim(),
    input.resource.trim(),
    input.resourceId.trim(),
    String(input.revision ?? "0"),
    input.recipient?.trim() ?? "all",
    String(input.attempt ?? 0),
  ];
  const canonical = values.map((value) => `${value.length}:${value}`).join("|");
  let hash = 0x811c9dc5;
  for (const codePoint of canonical) {
    hash ^= codePoint.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Deterministic operation identifier. Include `attempt` when separate
 * delivery attempts need distinct audit records; leave it out to correlate
 * a logical operation across retries.
 */
export function createOperationId(input: OperationIdentity): string {
  validateOperationIdentity(input);
  return `op_${hashIdentity(input)}`;
}

export const operationIdFor = createOperationId;

export function isSameIdempotentOperation(left: OperationIdentity, right: OperationIdentity): boolean {
  return createIdempotencyKey(left) === createIdempotencyKey(right);
}

export function createReminderIdempotencyKey(input: {
  reminderId: string;
  taskId: string;
  speakerId: string;
  revision?: string | number;
}): string {
  return createIdempotencyKey({
    operation: "reminder",
    resource: "task",
    resourceId: input.taskId,
    revision: input.revision ?? input.reminderId,
    recipient: input.speakerId,
  });
}

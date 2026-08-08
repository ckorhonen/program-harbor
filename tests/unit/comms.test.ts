import { describe, expect, it } from "vitest";
import {
  ALLOWED_TEMPLATE_VARIABLES,
  MissingTemplateValueError,
  UnknownTemplateVariableError,
  createIdempotencyKey,
  createOperationId,
  createReminderIdempotencyKey,
  evaluateReminderEligibility,
  extractTemplateVariables,
  isReminderEligible,
  renderTemplate,
  validateTemplateVariables,
} from "../../src/lib/comms";

describe("communication templates", () => {
  it("renders every allowlisted event-operation variable", () => {
    const template = [
      "Hi {{ speakerName }},",
      "{{eventName}} is in {{eventTimezone}}.",
      "Your session {{sessionTitle}} is {{sessionDate}} at {{sessionTime}} in {{room}} / {{track}}.",
      "Portal: {{portalUrl}}",
      "Open work: {{outstandingTaskList}} (due {{dueDate}}).",
    ].join(" ");

    const rendered = renderTemplate(template, {
      speakerName: "Ada Lovelace",
      eventName: "AI Engineer Sandbox Summit",
      sessionTitle: "Reliable Agents",
      sessionDate: "August 12, 2026",
      sessionTime: "2:00 PM",
      eventTimezone: "America/Los_Angeles",
      room: "Cedar",
      track: "Systems",
      portalUrl: "https://example.test/portal/ada",
      outstandingTaskList: ["Bio", "Slides"],
      dueDate: "August 1, 2026",
    });

    expect(rendered).toContain("Hi Ada Lovelace");
    expect(rendered).toContain("Open work: Bio, Slides");
    const variables = extractTemplateVariables(template);
    expect(variables).toHaveLength(ALLOWED_TEMPLATE_VARIABLES.length);
    expect(variables).toEqual(expect.arrayContaining([...ALLOWED_TEMPLATE_VARIABLES]));
  });

  it("rejects unknown variables before rendering", () => {
    const template = "Hello {{speakerName}}. Internal note: {{secretToken}}";
    const validation = validateTemplateVariables(template);

    expect(validation.valid).toBe(false);
    expect(validation.unknownVariables).toEqual(["secretToken"]);
    expect(() => renderTemplate(template, { speakerName: "Ada" })).toThrow(UnknownTemplateVariableError);
    expect(() => extractTemplateVariables(template)).toThrow(/secretToken/);
  });

  it("rejects a missing value instead of silently producing an empty message", () => {
    expect(() => renderTemplate("Hello {{speakerName}}", {})).toThrow(MissingTemplateValueError);
  });
});

describe("reminder eligibility", () => {
  it("does not remind a required task that was completed", () => {
    const task = {
      id: "task-bio",
      required: true,
      status: "completed" as const,
      completedAt: "2026-08-01T15:00:00.000Z",
    };

    expect(isReminderEligible(task)).toBe(false);
    expect(evaluateReminderEligibility(task)).toEqual({
      eligible: false,
      reason: "already-completed",
    });
  });

  it("keeps incomplete required and overdue tasks eligible", () => {
    expect(
      isReminderEligible({
        id: "task-slides",
        required: true,
        status: "overdue",
        dueAt: "2026-08-01T15:00:00.000Z",
      }),
    ).toBe(true);
    expect(isReminderEligible({ required: false, status: "pending" })).toBe(false);
    expect(isReminderEligible({ required: true, status: "cancelled" })).toBe(false);
  });
});

describe("operation and idempotency helpers", () => {
  const operation = {
    operation: "send-reminder",
    resource: "speaker-task",
    resourceId: "task-slides",
    revision: 3,
    recipient: "speaker@example.test",
  } as const;

  it("keeps the same retry key for identical logical work and changes it for a new revision", () => {
    expect(createIdempotencyKey(operation)).toBe(createIdempotencyKey({ ...operation }));
    expect(createIdempotencyKey(operation)).not.toBe(
      createIdempotencyKey({ ...operation, revision: 4 }),
    );
    expect(createReminderIdempotencyKey({
      reminderId: "reminder-1",
      taskId: "task-slides",
      speakerId: "speaker-1",
      revision: 2,
    })).toBe(createReminderIdempotencyKey({
      reminderId: "reminder-1",
      taskId: "task-slides",
      speakerId: "speaker-1",
      revision: 2,
    }));
  });

  it("produces stable operation IDs and distinct attempt IDs", () => {
    expect(createOperationId(operation)).toBe(createOperationId({ ...operation }));
    expect(createOperationId(operation)).not.toBe(createOperationId({ ...operation, attempt: 1 }));
  });
});

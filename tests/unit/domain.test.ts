import { describe, expect, it } from "vitest";
import { calculateWeightedReviewScore, detectScheduleConflicts, dropHiddenAnswers, evaluateConditionalAnswers, routeSubmission } from "../../src/lib/domain";
import { seedDemoState } from "../../src/lib/seed";

describe("P0 domain rules", () => {
  it("reveals workshop requirements and drops hidden answers for talks", () => {
    const form = seedDemoState().submissionForms[0];
    const workshop = evaluateConditionalAnswers(form.fields, { sessionFormat: "Workshop", handsOnRequirements: "Laptop" });
    expect(workshop.visibleFieldKeys).toContain("handsOnRequirements");
    expect(workshop.requiredFieldKeys).toContain("handsOnRequirements");
    const talk = dropHiddenAnswers(form.fields, { sessionFormat: "Talk", handsOnRequirements: "should not persist" });
    expect(talk).not.toHaveProperty("handsOnRequirements");
  });

  it("routes security and uses a deterministic fallback", () => {
    const state = seedDemoState();
    expect(routeSubmission({ category: "Security" }, state.routingRules, { reviewQueue: "general" }).reviewQueue).toBe("security-review");
    expect(routeSubmission({ category: "Unknown" }, state.routingRules, { reviewQueue: "general" }).source).toBe("fallback");
  });

  it("excludes abstentions from weighted scoring", () => {
    const state = seedDemoState();
    const result = calculateWeightedReviewScore(state.rubricCriteria, state.reviews.filter((review) => review.submissionId === "submission-01"));
    expect(result.abstainedReviewCount).toBe(1);
    expect(result.eligibleReviewCount).toBe(1);
    expect(result.weightedScore).toBeGreaterThan(0);
  });

  it("treats boundary-touching schedule entries as non-overlapping", () => {
    const state = seedDemoState();
    const entries = state.scheduleEntries.slice(0, 1).map((entry) => ({ ...entry, startsAt: "2026-09-17T09:00:00-04:00", endsAt: "2026-09-17T10:00:00-04:00" }));
    const adjacent = { ...entries[0], id: "adjacent", sessionId: "session-adjacent", startsAt: "2026-09-17T10:00:00-04:00", endsAt: "2026-09-17T11:00:00-04:00" };
    expect(detectScheduleConflicts([entries[0], adjacent], { startsAt: "2026-09-17T09:00:00-04:00", endsAt: "2026-09-18T18:00:00-04:00" }).filter((conflict) => conflict.kind === "room")).toHaveLength(0);
  });
});

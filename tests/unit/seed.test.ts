import { describe, expect, it } from "vitest";
import { seedDemoState } from "../../src/lib/seed";

describe("deterministic demo seed", () => {
  it("contains the required judge journey records", () => {
    const state = seedDemoState();
    expect(state.events[0].name).toBe("AI Engineer Sandbox Summit");
    expect(state.events[0].timezone).toBe("America/New_York");
    expect(state.submissions).toHaveLength(12);
    expect(state.speakers).toHaveLength(10);
    expect(state.sessions).toHaveLength(8);
    expect(state.scheduleEntries).toHaveLength(7);
    expect(state.evaluationRounds).toHaveLength(2);
    expect(state.rubricCriteria).toHaveLength(5);
    expect(state.conflicts.filter((item) => item.kind === "room")).toHaveLength(1);
    expect(state.conflicts.filter((item) => item.kind === "speaker")).toHaveLength(1);
  });
});

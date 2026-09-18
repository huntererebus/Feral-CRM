import { describe, it, expect } from "vitest";
import { statusDisplay, STATUS_STEPPER_ORDER } from "@/lib/design/status-zones";
import { PROJECT_STATUS_TRANSITIONS } from "@/lib/project-status";

describe("statusDisplay", () => {
  it("provides a display entry for every ProjectStatus the transition graph knows about", () => {
    for (const status of Object.keys(PROJECT_STATUS_TRANSITIONS)) {
      expect(() => statusDisplay(status as keyof typeof PROJECT_STATUS_TRANSITIONS)).not.toThrow();
      expect(statusDisplay(status as keyof typeof PROJECT_STATUS_TRANSITIONS).label.length).toBeGreaterThan(0);
    }
  });

  it("groups CLIENT_REVIEW and FINAL_REVIEW into the client-review zone", () => {
    expect(statusDisplay("CLIENT_REVIEW").zone).toBe("client-review");
    expect(statusDisplay("FINAL_REVIEW").zone).toBe("client-review");
  });

  it("groups both revision states into the revision zone", () => {
    expect(statusDisplay("REVISION_REQUESTED").zone).toBe("revision");
    expect(statusDisplay("REVISION_IN_PROGRESS").zone).toBe("revision");
  });

  it("puts APPROVED and COMPLETED in the complete zone", () => {
    expect(statusDisplay("APPROVED").zone).toBe("complete");
    expect(statusDisplay("COMPLETED").zone).toBe("complete");
  });
});

describe("STATUS_STEPPER_ORDER", () => {
  it("excludes the detour states (revisions, archived) from the happy-path stepper", () => {
    expect(STATUS_STEPPER_ORDER).not.toContain("REVISION_REQUESTED");
    expect(STATUS_STEPPER_ORDER).not.toContain("REVISION_IN_PROGRESS");
    expect(STATUS_STEPPER_ORDER).not.toContain("ARCHIVED");
  });

  it("starts at NEW and ends at COMPLETED", () => {
    expect(STATUS_STEPPER_ORDER[0]).toBe("NEW");
    expect(STATUS_STEPPER_ORDER[STATUS_STEPPER_ORDER.length - 1]).toBe("COMPLETED");
  });

  it("has no duplicate entries", () => {
    expect(new Set(STATUS_STEPPER_ORDER).size).toBe(STATUS_STEPPER_ORDER.length);
  });
});

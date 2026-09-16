import { describe, it, expect } from "vitest";
import {
  isValidProjectStatusTransition,
  eligibleRolesForTransition,
  PROJECT_STATUS_TRANSITIONS,
} from "@/lib/project-status";

describe("project status graph shape", () => {
  it("defines an entry for every ProjectStatus value with no dangling edges", () => {
    const allStatuses = Object.keys(PROJECT_STATUS_TRANSITIONS);
    for (const status of allStatuses) {
      for (const transition of PROJECT_STATUS_TRANSITIONS[status as keyof typeof PROJECT_STATUS_TRANSITIONS] ?? []) {
        expect(allStatuses).toContain(transition.to);
      }
    }
  });

  it("makes ARCHIVED a terminal state", () => {
    expect(PROJECT_STATUS_TRANSITIONS.ARCHIVED).toEqual([]);
  });
});

describe("isValidProjectStatusTransition", () => {
  it("allows the normal forward path from NEW to UPLOADED", () => {
    expect(isValidProjectStatusTransition("NEW", "UPLOADED")).toBe(true);
  });

  it("rejects skipping straight from NEW to COMPLETED", () => {
    expect(isValidProjectStatusTransition("NEW", "COMPLETED")).toBe(false);
  });

  it("rejects moving anywhere out of ARCHIVED", () => {
    expect(isValidProjectStatusTransition("ARCHIVED", "NEW")).toBe(false);
  });

  it("allows ARCHIVED as an escape hatch from an active mid-pipeline state", () => {
    expect(isValidProjectStatusTransition("IN_EDITING", "ARCHIVED")).toBe(true);
  });

  it("allows the kickback from INTERNAL_REVIEW back to IN_EDITING", () => {
    expect(isValidProjectStatusTransition("INTERNAL_REVIEW", "IN_EDITING")).toBe(true);
  });

  it("rejects a reverse move that isn't a modeled kickback", () => {
    expect(isValidProjectStatusTransition("COMPLETED", "APPROVED")).toBe(false);
  });
});

describe("eligibleRolesForTransition", () => {
  it("returns null for a transition that isn't on the graph at all", () => {
    expect(eligibleRolesForTransition("NEW", "COMPLETED")).toBeNull();
  });

  it("returns an empty list for client-review-decision edges reserved for a future stage", () => {
    expect(eligibleRolesForTransition("CLIENT_REVIEW", "REVISION_REQUESTED")).toEqual([]);
    expect(eligibleRolesForTransition("CLIENT_REVIEW", "FINAL_REVIEW")).toEqual([]);
    expect(eligibleRolesForTransition("FINAL_REVIEW", "APPROVED")).toEqual([]);
  });

  it("includes editor alongside staff for the transitions an assigned editor drives", () => {
    expect(eligibleRolesForTransition("IN_EDITING", "INTERNAL_REVIEW")).toEqual(
      expect.arrayContaining(["editor", "org_admin", "account_manager"])
    );
  });

  it("keeps staff-only edges free of editor", () => {
    expect(eligibleRolesForTransition("INTERNAL_REVIEW", "CLIENT_REVIEW")).toEqual(
      expect.arrayContaining(["org_admin", "account_manager"])
    );
    expect(eligibleRolesForTransition("INTERNAL_REVIEW", "CLIENT_REVIEW")).not.toContain("editor");
  });
});

import { describe, it, expect } from "vitest";
import { PROJECT_STATUS_NOTIFICATION_RULES, notificationRuleForStatus } from "@/lib/project-notifications";

describe("PROJECT_STATUS_NOTIFICATION_RULES", () => {
  it("returns null for a status with no notification rule (purely internal bookkeeping)", () => {
    expect(notificationRuleForStatus("NEW")).toBeNull();
    expect(notificationRuleForStatus("IN_EDITING")).toBeNull();
    expect(notificationRuleForStatus("ARCHIVED")).toBeNull();
  });

  it("notifies the client when a draft enters CLIENT_REVIEW, and it's worth an email", () => {
    const rule = notificationRuleForStatus("CLIENT_REVIEW");
    expect(rule).not.toBeNull();
    expect(rule?.notifyRoles).toEqual(["client"]);
    expect(rule?.sendEmail).toBe(true);
  });

  it("notifies both editor and account manager on a revision request", () => {
    const rule = notificationRuleForStatus("REVISION_REQUESTED");
    expect(rule?.notifyRoles).toEqual(expect.arrayContaining(["editor", "account_manager"]));
  });

  it("does not email on the internal FINAL_REVIEW handoff", () => {
    expect(notificationRuleForStatus("FINAL_REVIEW")?.sendEmail).toBe(false);
  });

  it("builds a title that includes the project name", () => {
    const rule = notificationRuleForStatus("APPROVED");
    expect(rule?.buildTitle("Summer Campaign")).toContain("Summer Campaign");
  });

  it("every rule's notifyRoles is non-empty", () => {
    for (const status of Object.keys(PROJECT_STATUS_NOTIFICATION_RULES)) {
      const rule = PROJECT_STATUS_NOTIFICATION_RULES[status as keyof typeof PROJECT_STATUS_NOTIFICATION_RULES];
      expect(rule?.notifyRoles.length).toBeGreaterThan(0);
    }
  });
});

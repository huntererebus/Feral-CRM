import type { ProjectStatus, Role } from "@prisma/client";

/**
 * Rather than scattering notification calls across projects.ts, reviews.ts,
 * and media.ts individually (easy to miss a case, easy to drift out of
 * sync as new transitions get added), every status change funnels through
 * one place — projects.ts's applyStatusChange — so this table is the
 * single source of truth for "who gets told when a project enters status
 * X," and services/notifications.ts's notifyProjectStatusChange is the
 * only thing that reads it.
 *
 * `notifyRoles` names roles relative to the project, not literal Role
 * values to blast at every user with that Role in the org — resolving
 * "editor" to the actual assigned editor (not every editor in the org) is
 * services/notifications.ts's job; this module stays pure and DB-free, same
 * as project-status.ts, so it's unit-testable without touching Prisma.
 *
 * A status with no entry here (NEW, UPLOADED, AWAITING_ASSIGNMENT,
 * IN_EDITING, INTERNAL_REVIEW, ARCHIVED) simply doesn't notify anyone —
 * those are either not yet meaningful to the client, or purely internal
 * bookkeeping.
 */
export type ProjectStatusNotificationRule = {
  notifyRoles: Role[];
  type: string;
  buildTitle: (projectName: string) => string;
  sendEmail: boolean;
};

export const PROJECT_STATUS_NOTIFICATION_RULES: Partial<Record<ProjectStatus, ProjectStatusNotificationRule>> = {
  ASSIGNED: {
    notifyRoles: ["editor"],
    type: "project.assigned",
    buildTitle: (name) => `You've been assigned to "${name}"`,
    sendEmail: true,
  },
  CLIENT_REVIEW: {
    notifyRoles: ["client"],
    type: "project.client_review",
    buildTitle: (name) => `A draft is ready for your review: "${name}"`,
    sendEmail: true,
  },
  REVISION_REQUESTED: {
    notifyRoles: ["editor", "account_manager"],
    type: "project.revision_requested",
    buildTitle: (name) => `A revision was requested on "${name}"`,
    sendEmail: true,
  },
  FINAL_REVIEW: {
    notifyRoles: ["account_manager"],
    type: "project.final_review",
    buildTitle: (name) => `Draft approved — ready for final export: "${name}"`,
    sendEmail: false, // internal handoff, not a milestone worth an inbox interruption
  },
  APPROVED: {
    notifyRoles: ["account_manager", "editor"],
    type: "project.approved",
    buildTitle: (name) => `Final delivery approved: "${name}"`,
    sendEmail: true,
  },
  COMPLETED: {
    notifyRoles: ["client"],
    type: "project.completed",
    buildTitle: (name) => `"${name}" is complete`,
    sendEmail: false, // approving the final already emailed the client; completion is a status bookkeeping step, not new news
  },
};

export function notificationRuleForStatus(status: ProjectStatus): ProjectStatusNotificationRule | null {
  return PROJECT_STATUS_NOTIFICATION_RULES[status] ?? null;
}

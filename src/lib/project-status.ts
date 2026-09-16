import type { ProjectStatus, Role } from "@prisma/client";

/**
 * The project workflow as a directed graph: for each status, which statuses
 * it may move to next, and which roles may *attempt* that specific move.
 *
 * This is deliberately a pure, DB-free module (same shape as
 * src/middleware.ts's extractOrgSlug) so the graph itself is unit-testable
 * without touching Prisma — see tests/project-status.test.ts.
 *
 * `eligibleRoles` is necessary but not sufficient: an editor listed here
 * still has to be the project's assigned editor (or an explicit
 * ProjectMember) for the move to be allowed. That per-resource assignment
 * check happens in rbac.ts's canTransitionProjectStatus, which takes the
 * eligibleRoles list computed here as an input — this module only knows
 * "which kinds of user," never "which specific user."
 *
 * Two edges (CLIENT_REVIEW -> REVISION_REQUESTED and CLIENT_REVIEW ->
 * FINAL_REVIEW, plus FINAL_REVIEW -> APPROVED) currently have an empty
 * eligibleRoles list. That's intentional, not an oversight: those moves are
 * the client's approve/request-revision decision, which belongs to the
 * Approval/RevisionRequest flow landing in a later stage. That flow will
 * call moveProjectStatus() directly (bypassing the generic status endpoint's
 * role gate) once it exists — see src/lib/services/projects.ts.
 */
export type ProjectStatusTransition = {
  to: ProjectStatus;
  eligibleRoles: Role[];
};

const STAFF: Role[] = ["org_admin", "account_manager"];

export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatusTransition[]> = {
  NEW: [
    { to: "UPLOADED", eligibleRoles: STAFF },
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  UPLOADED: [
    { to: "AWAITING_ASSIGNMENT", eligibleRoles: STAFF },
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  AWAITING_ASSIGNMENT: [
    // Normally reached as a side effect of assignEditor() rather than a
    // direct call to this endpoint — see projects.ts — but staff can also
    // force it (e.g. correcting a bad assignment) without going through
    // assignEditor again.
    { to: "ASSIGNED", eligibleRoles: STAFF },
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  ASSIGNED: [
    { to: "IN_EDITING", eligibleRoles: [...STAFF, "editor"] },
    { to: "AWAITING_ASSIGNMENT", eligibleRoles: STAFF }, // unassign
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  IN_EDITING: [
    { to: "INTERNAL_REVIEW", eligibleRoles: [...STAFF, "editor"] },
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  INTERNAL_REVIEW: [
    { to: "CLIENT_REVIEW", eligibleRoles: STAFF },
    { to: "IN_EDITING", eligibleRoles: STAFF }, // kicked back to the editor
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  CLIENT_REVIEW: [
    { to: "REVISION_REQUESTED", eligibleRoles: [] }, // future: RevisionRequest flow
    { to: "FINAL_REVIEW", eligibleRoles: [] }, // future: Approval flow
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  REVISION_REQUESTED: [
    { to: "REVISION_IN_PROGRESS", eligibleRoles: [...STAFF, "editor"] },
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  REVISION_IN_PROGRESS: [
    { to: "INTERNAL_REVIEW", eligibleRoles: [...STAFF, "editor"] },
    { to: "CLIENT_REVIEW", eligibleRoles: STAFF },
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  FINAL_REVIEW: [
    { to: "APPROVED", eligibleRoles: [] }, // future: Approval flow
    { to: "CLIENT_REVIEW", eligibleRoles: STAFF }, // final export didn't match the approved draft — send back
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  APPROVED: [
    { to: "COMPLETED", eligibleRoles: STAFF },
    { to: "ARCHIVED", eligibleRoles: STAFF },
  ],
  COMPLETED: [{ to: "ARCHIVED", eligibleRoles: STAFF }],
  ARCHIVED: [], // terminal — no forward transitions
};

export function isValidProjectStatusTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  // The `?? []` isn't defensive dead code: every ProjectStatus key really is
  // populated above, but tsconfig's noUncheckedIndexedAccess doesn't take
  // that on faith for a Record indexed by an enum-like type, so it types
  // every lookup here as possibly undefined.
  return (PROJECT_STATUS_TRANSITIONS[from] ?? []).some((t) => t.to === to);
}

/** Roles that may attempt this transition, or null if the transition itself isn't on the graph. */
export function eligibleRolesForTransition(from: ProjectStatus, to: ProjectStatus): Role[] | null {
  const transition = (PROJECT_STATUS_TRANSITIONS[from] ?? []).find((t) => t.to === to);
  return transition ? transition.eligibleRoles : null;
}

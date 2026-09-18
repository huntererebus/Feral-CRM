import type { Role, MediaKind } from "@prisma/client";

/**
 * Every function here is a pure function of (user, resource) -> boolean.
 * No database access happens in this file — callers fetch the resource
 * first (including the fields these checks need), then ask "is this
 * allowed," so the same logic is usable in API routes, server components,
 * and unit tests without spinning up a database. See tests/rbac.test.ts.
 *
 * This mirrors the matrix in planning-doc.md Section 2.
 */

export type SessionUser = {
  id: string;
  role: Role;
  organizationId: string | null;
  clientId: string | null;
};

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// --- Base scope checks -----------------------------------------------------

export function isPlatformAdmin(user: SessionUser): boolean {
  return user.role === "platform_admin";
}

export function belongsToOrganization(user: SessionUser, organizationId: string): boolean {
  return isPlatformAdmin(user) || user.organizationId === organizationId;
}

export function belongsToClient(user: SessionUser, clientId: string): boolean {
  return user.role === "client" && user.clientId === clientId;
}

export function isOrgStaff(user: SessionUser): boolean {
  return user.role === "org_admin" || user.role === "account_manager" || user.role === "editor";
}

// --- Resource shapes needed for checks --------------------------------------
// Callers pass only the fields relevant to the check, not full Prisma models,
// so these functions stay decoupled from the ORM.

export type ClientScope = {
  organizationId: string;
};

export type ProjectScope = {
  organizationId: string;
  clientId: string;
  accountManagerId: string | null;
  editorId: string | null;
  /** user IDs explicitly attached via ProjectMember, e.g. observers/CC'd staff */
  memberUserIds?: string[];
};

// --- Clients -----------------------------------------------------------------

export function canManageClients(user: SessionUser, org: ClientScope): boolean {
  if (!belongsToOrganization(user, org.organizationId)) return false;
  return user.role === "org_admin" || user.role === "account_manager";
}

export function canViewClient(
  user: SessionUser,
  client: ClientScope & { accountManagerId?: string | null }
): boolean {
  if (!belongsToOrganization(user, client.organizationId)) return false;
  if (user.role === "org_admin") return true;
  if (user.role === "account_manager") return client.accountManagerId === user.id || true; // AMs see their org's clients; assignment narrows *editing*, not visibility, per the matrix
  return false; // editors and clients don't browse the client list at all
}

// --- Projects ------------------------------------------------------------------

export function canCreateProject(user: SessionUser, org: ClientScope): boolean {
  if (!belongsToOrganization(user, org.organizationId)) return false;
  return user.role === "org_admin" || user.role === "account_manager" || user.role === "client";
}

export function canViewProject(user: SessionUser, project: ProjectScope): boolean {
  if (isPlatformAdmin(user)) return true; // support access — see Section 10, must still be audited by the caller
  if (!belongsToOrganization(user, project.organizationId)) return false;

  switch (user.role) {
    case "org_admin":
      return true;
    case "account_manager":
      return project.accountManagerId === user.id || (project.memberUserIds ?? []).includes(user.id) || true; // AMs see all of their org's projects per the matrix
    case "editor":
      return project.editorId === user.id || (project.memberUserIds ?? []).includes(user.id);
    case "client":
      return belongsToClient(user, project.clientId);
    default:
      return false;
  }
}

export function canAssignEditor(user: SessionUser, project: ProjectScope): boolean {
  if (!belongsToOrganization(user, project.organizationId)) return false;
  return user.role === "org_admin" || user.role === "account_manager";
}

export function canUploadSourceMedia(user: SessionUser, project: ProjectScope): boolean {
  if (!canViewProject(user, project)) return false;
  if (user.role === "client") return belongsToClient(user, project.clientId);
  return user.role === "org_admin" || user.role === "account_manager";
}

export function canUploadDraftOrFinalMedia(user: SessionUser, project: ProjectScope): boolean {
  if (user.role !== "editor") return false;
  return project.editorId === user.id || (project.memberUserIds ?? []).includes(user.id);
}

/**
 * Gates *visibility* of a media asset by kind, on top of the general
 * project-visibility check. Raw source footage is production input, not a
 * deliverable — a client never sees it, even though they can often upload
 * it themselves (canUploadSourceMedia) when it's their own raw material.
 * Draft/final visibility isn't further restricted here by project status
 * (e.g. hiding an unfinished draft until it's actually sent for review) —
 * that's a "when do we notify/expose this version" decision that belongs
 * to the Approval flow in a later stage, not a blanket kind-based rule.
 */
export function canViewMediaAsset(user: SessionUser, project: ProjectScope, kind: MediaKind): boolean {
  if (!canViewProject(user, project)) return false;
  if (kind === "source" && user.role === "client") return false;
  return true;
}

export function canDeleteProject(user: SessionUser, project: ProjectScope): boolean {
  if (!belongsToOrganization(user, project.organizationId)) return false;
  return user.role === "org_admin" || user.role === "account_manager";
}

// --- Project details / requirements / members (Stage 3) ------------------------

// Same rule today (org_admin/account_manager, org-scoped) as three separate
// named exports rather than one shared function — matches the granularity
// of canUploadSourceMedia vs canUploadDraftOrFinalMedia above, and keeps
// each call site's intent self-documenting if one of these three narrows
// independently later (e.g. requirements becoming AM-only).
export function canManageProjectDetails(user: SessionUser, project: ClientScope): boolean {
  if (!belongsToOrganization(user, project.organizationId)) return false;
  return user.role === "org_admin" || user.role === "account_manager";
}

export function canManageProjectRequirements(user: SessionUser, project: ClientScope): boolean {
  return canManageProjectDetails(user, project);
}

export function canManageProjectMembers(user: SessionUser, project: ClientScope): boolean {
  return canManageProjectDetails(user, project);
}

/**
 * Gates a specific status transition attempt. `eligibleRoles` comes from
 * src/lib/project-status.ts's graph (computed by the caller from the
 * project's current status and the requested target status) — this
 * function only knows how to check "is this actor's role on that list, and
 * if they're an editor, are they actually assigned to this project."
 */
export function canTransitionProjectStatus(
  user: SessionUser,
  project: ProjectScope,
  eligibleRoles: Role[]
): boolean {
  if (!belongsToOrganization(user, project.organizationId)) return false;
  if (!eligibleRoles.includes(user.role)) return false;
  if (user.role === "editor") {
    return project.editorId === user.id || (project.memberUserIds ?? []).includes(user.id);
  }
  return true;
}

// --- Approvals / revisions ------------------------------------------------------

export function canApproveOrRequestRevision(user: SessionUser, project: ProjectScope): boolean {
  return user.role === "client" && belongsToClient(user, project.clientId);
}

/** Staff who can see this project may mark a revision request in-progress/resolved — includes the assigned editor, who is the one actually addressing it. */
export function canManageRevisionRequest(user: SessionUser, project: ProjectScope): boolean {
  if (!canViewProject(user, project)) return false;
  return isOrgStaff(user);
}

/** Same authority tier as canPostInternalNote — resolving a comment thread is a staff action, scoped to projects this staff member can actually see. */
export function canResolveMediaComment(user: SessionUser, project: ProjectScope): boolean {
  if (!canViewProject(user, project)) return false;
  return isOrgStaff(user);
}

// --- Comments / messages: the client-safety-critical check -----------------------

export type CommentVisibility = "client_facing" | "internal";

/**
 * The single most important function in this file: a client-role user must
 * NEVER see an internal-visibility comment or message. Every list query
 * serving a client must call this per-row (or, better, filter at the query
 * level using this same predicate) rather than trusting the UI to hide it.
 */
export function canViewComment(
  user: SessionUser,
  project: ProjectScope,
  visibility: CommentVisibility
): boolean {
  if (!canViewProject(user, project)) return false;
  if (visibility === "internal") {
    return isOrgStaff(user) || isPlatformAdmin(user);
  }
  return true; // client_facing is visible to anyone who can see the project at all
}

/**
 * Was previously scoped to org membership only, which meant any editor in
 * the org could post an "internal" note on a project they aren't assigned
 * to — flagged during Stage 5, fixed here because Stage 6's Messages reuse
 * this same check and the gap matters more once it also gates attachments.
 */
export function canPostInternalNote(user: SessionUser, project: ProjectScope): boolean {
  if (!canViewProject(user, project)) return false;
  return isOrgStaff(user);
}

// --- Organization settings / user invites ---------------------------------------

export function canManageOrgSettings(user: SessionUser, organizationId: string): boolean {
  if (!belongsToOrganization(user, organizationId)) return false;
  return user.role === "org_admin";
}

/** The staff directory (for assignment pickers etc.) — staff only; clients don't browse the org's member list. */
export function canViewOrgMembers(user: SessionUser, organizationId: string): boolean {
  if (!belongsToOrganization(user, organizationId)) return false;
  return isOrgStaff(user);
}

export type InvitableRole = "org_admin" | "account_manager" | "editor" | "client";

/**
 * Who can invite whom. `platform_admin` is intentionally never invitable
 * through this path — new platform admins are provisioned out-of-band,
 * not through an in-app invite flow, since that credential can reach every
 * organization (Section 10).
 */
export function canInviteRole(
  user: SessionUser,
  organizationId: string,
  targetRole: InvitableRole
): boolean {
  if (!belongsToOrganization(user, organizationId)) return false;

  if (user.role === "org_admin") return true; // org admins can invite any in-org role, including other org admins
  if (user.role === "account_manager") return targetRole === "client";
  return false;
}

// --- Audit log -----------------------------------------------------------------

export function canViewAuditLog(user: SessionUser, org: ClientScope): boolean {
  if (isPlatformAdmin(user)) return true;
  if (!belongsToOrganization(user, org.organizationId)) return false;
  return user.role === "org_admin" || user.role === "account_manager";
}

// --- Assertion helper for use in API routes -------------------------------------

export function assert(condition: boolean, message = "Forbidden"): asserts condition {
  if (!condition) throw new ForbiddenError(message);
}

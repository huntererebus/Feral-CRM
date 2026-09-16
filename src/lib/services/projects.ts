import { db } from "@/lib/db";
import {
  canCreateProject,
  canViewProject,
  canManageProjectDetails,
  canManageProjectRequirements,
  canManageProjectMembers,
  canAssignEditor,
  canDeleteProject,
  canTransitionProjectStatus,
  assert,
  type SessionUser,
  type ProjectScope,
} from "@/lib/rbac";
import { isValidProjectStatusTransition, eligibleRolesForTransition } from "@/lib/project-status";
import { recordAudit } from "@/lib/audit";
import {
  createProjectSchema,
  updateProjectSchema,
  assignEditorSchema,
  transitionProjectStatusSchema,
  upsertProjectRequirementsSchema,
  addProjectMemberSchema,
} from "@/lib/validation/projects";
import type { z } from "zod";
import type { ProjectStatus } from "@prisma/client";

export {
  createProjectSchema,
  updateProjectSchema,
  assignEditorSchema,
  transitionProjectStatusSchema,
  upsertProjectRequirementsSchema,
  addProjectMemberSchema,
} from "@/lib/validation/projects";

/** Builds the ProjectScope rbac.ts needs, including the member-ids list an
 * assigned editor's access is checked against. Every function below that
 * loads a project for a permission check goes through this rather than
 * hand-rolling the `{ organizationId, clientId, ... }` shape inline. */
function toScope(project: {
  organizationId: string;
  clientId: string;
  accountManagerId: string | null;
  editorId: string | null;
  members?: { userId: string }[];
}): ProjectScope {
  return {
    organizationId: project.organizationId,
    clientId: project.clientId,
    accountManagerId: project.accountManagerId,
    editorId: project.editorId,
    memberUserIds: project.members?.map((m) => m.userId) ?? [],
  };
}

export async function createProject(
  actor: SessionUser,
  organizationId: string,
  input: z.infer<typeof createProjectSchema>,
  ipAddress: string | null
) {
  assert(canCreateProject(actor, { organizationId }), "You don't have permission to create projects.");

  const client = await db.client.findFirst({
    where: { id: input.clientId, organizationId, deletedAt: null },
  });
  assert(client !== null, "clientId must reference an active client in this organization.");

  if (input.accountManagerId) {
    const am = await db.user.findFirst({
      where: { id: input.accountManagerId, organizationId, role: "account_manager" },
    });
    assert(am !== null, "accountManagerId must be an account manager in this organization.");
  }

  // A client-role user creating a project is always creating it on behalf
  // of their own client — never lets them pick a different clientId, even
  // though createProjectSchema doesn't itself know about roles.
  if (actor.role === "client") {
    assert(input.clientId === actor.clientId, "You can only create projects for your own account.");
  }

  const project = await db.project.create({
    data: {
      organizationId,
      clientId: input.clientId,
      name: input.name,
      description: input.description ?? null,
      contentType: input.contentType ?? null,
      platform: input.platform ?? null,
      priority: input.priority,
      accountManagerId: input.accountManagerId ?? null,
      createdById: actor.id,
      dueDate: input.dueDate ?? null,
      status: "NEW",
    },
  });

  await recordAudit({
    userId: actor.id,
    organizationId,
    clientId: input.clientId,
    action: "project.created",
    resourceType: "project",
    resourceId: project.id,
    ipAddress,
  });

  return project;
}

export async function listProjects(
  actor: SessionUser,
  organizationId: string,
  filters?: { clientId?: string; status?: ProjectStatus }
) {
  // Unlike listClients, there's no single coarse "can this role browse
  // projects at all" gate — visibility genuinely differs per row (an editor
  // only sees their own assignments, a client only their own projects), so
  // this always filters at the query level per role rather than asserting
  // once and returning everything.
  const where = {
    organizationId,
    deletedAt: null,
    ...(filters?.clientId ? { clientId: filters.clientId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(actor.role === "editor"
      ? { OR: [{ editorId: actor.id }, { members: { some: { userId: actor.id } } }] }
      : {}),
    ...(actor.role === "client" ? { clientId: actor.clientId ?? "__no_client__" } : {}),
  };

  return db.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      accountManager: { select: { id: true, name: true } },
      editor: { select: { id: true, name: true } },
    },
  });
}

export async function getProject(actor: SessionUser, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      client: { select: { id: true, name: true } },
      accountManager: { select: { id: true, name: true } },
      editor: { select: { id: true, name: true } },
      requirements: true,
      members: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
  });
  assert(project !== null, "Project not found.");
  assert(canViewProject(actor, toScope(project)), "You don't have permission to view this project.");
  return project;
}

export async function updateProject(
  actor: SessionUser,
  projectId: string,
  input: z.infer<typeof updateProjectSchema>,
  ipAddress: string | null
) {
  const existing = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(existing !== null, "Project not found.");
  assert(canManageProjectDetails(actor, toScope(existing)), "You don't have permission to edit this project.");

  if (input.accountManagerId) {
    const am = await db.user.findFirst({
      where: { id: input.accountManagerId, organizationId: existing.organizationId, role: "account_manager" },
    });
    assert(am !== null, "accountManagerId must be an account manager in this organization.");
  }

  const project = await db.project.update({ where: { id: projectId }, data: input });

  await recordAudit({
    userId: actor.id,
    organizationId: existing.organizationId,
    clientId: existing.clientId,
    action: "project.updated",
    resourceType: "project",
    resourceId: projectId,
    metadata: input as Record<string, unknown>,
    ipAddress,
  });

  return project;
}

export async function assignEditor(
  actor: SessionUser,
  projectId: string,
  input: z.infer<typeof assignEditorSchema>,
  ipAddress: string | null
) {
  const existing = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(existing !== null, "Project not found.");
  assert(canAssignEditor(actor, toScope(existing)), "You don't have permission to assign an editor.");

  const editor = await db.user.findFirst({
    where: { id: input.editorId, organizationId: existing.organizationId, role: "editor" },
  });
  assert(editor !== null, "editorId must be an editor in this organization.");

  // Assigning an editor while the project is still waiting on assignment
  // also advances its status — see project-status.ts's note on
  // AWAITING_ASSIGNMENT -> ASSIGNED. Any other current status leaves status
  // untouched (e.g. reassigning mid-edit doesn't reset progress).
  const nextStatus = existing.status === "AWAITING_ASSIGNMENT" ? "ASSIGNED" : existing.status;

  const project = await db.project.update({
    where: { id: projectId },
    data: { editorId: input.editorId, status: nextStatus },
  });

  await recordAudit({
    userId: actor.id,
    organizationId: existing.organizationId,
    clientId: existing.clientId,
    action: "project.editor_assigned",
    resourceType: "project",
    resourceId: projectId,
    metadata: { editorId: input.editorId },
    ipAddress,
  });

  return project;
}

export async function transitionProjectStatus(
  actor: SessionUser,
  projectId: string,
  input: z.infer<typeof transitionProjectStatusSchema>,
  ipAddress: string | null
) {
  const existing = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(existing !== null, "Project not found.");

  assert(
    isValidProjectStatusTransition(existing.status, input.toStatus),
    `Cannot move a project from ${existing.status} to ${input.toStatus}.`
  );

  const eligibleRoles = eligibleRolesForTransition(existing.status, input.toStatus) ?? [];
  assert(
    canTransitionProjectStatus(actor, toScope(existing), eligibleRoles),
    eligibleRoles.length === 0
      ? "This transition isn't available yet — it's driven by the review flow, not a direct status change."
      : "You don't have permission to make this status change."
  );

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      status: input.toStatus,
      completedAt: input.toStatus === "COMPLETED" ? new Date() : existing.completedAt,
    },
  });

  await recordAudit({
    userId: actor.id,
    organizationId: existing.organizationId,
    clientId: existing.clientId,
    action: "project.status_changed",
    resourceType: "project",
    resourceId: projectId,
    metadata: { from: existing.status, to: input.toStatus },
    ipAddress,
  });

  return project;
}

export async function deleteProject(actor: SessionUser, projectId: string, ipAddress: string | null) {
  const existing = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(existing !== null, "Project not found.");
  assert(canDeleteProject(actor, toScope(existing)), "You don't have permission to delete this project.");

  // Soft delete, same reasoning as archiveClient: media/audit/legal-hold
  // expectations rule out hard delete. This is distinct from the ARCHIVED
  // *status* (a normal, reachable workflow state) — deletedAt is "removed
  // from every active view," status is "where it sits in the pipeline."
  const project = await db.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });

  await recordAudit({
    userId: actor.id,
    organizationId: existing.organizationId,
    clientId: existing.clientId,
    action: "project.deleted",
    resourceType: "project",
    resourceId: projectId,
    ipAddress,
  });

  return project;
}

// --- Requirements ------------------------------------------------------------------

export async function getProjectRequirements(actor: SessionUser, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } }, requirements: true },
  });
  assert(project !== null, "Project not found.");
  assert(canViewProject(actor, toScope(project)), "You don't have permission to view this project.");
  return project.requirements;
}

export async function upsertProjectRequirements(
  actor: SessionUser,
  projectId: string,
  input: z.infer<typeof upsertProjectRequirementsSchema>,
  ipAddress: string | null
) {
  const existing = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(existing !== null, "Project not found.");
  assert(
    canManageProjectRequirements(actor, toScope(existing)),
    "You don't have permission to edit this project's requirements."
  );

  const data = {
    aspectRatio: input.aspectRatio ?? null,
    resolution: input.resolution ?? null,
    durationSeconds: input.durationSeconds ?? null,
    captionRequirements: input.captionRequirements ?? null,
    hashtags: input.hashtags ?? [],
    musicRequirements: input.musicRequirements ?? null,
    brandRequirements: input.brandRequirements ?? null,
    targetPostingDate: input.targetPostingDate ?? null,
  };

  const requirements = await db.projectRequirements.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });

  await recordAudit({
    userId: actor.id,
    organizationId: existing.organizationId,
    clientId: existing.clientId,
    action: "project.requirements_updated",
    resourceType: "project",
    resourceId: projectId,
    ipAddress,
  });

  return requirements;
}

// --- Members -----------------------------------------------------------------------

export async function listProjectMembers(actor: SessionUser, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(project !== null, "Project not found.");
  assert(canViewProject(actor, toScope(project)), "You don't have permission to view this project.");

  return db.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { addedAt: "asc" },
  });
}

export async function addProjectMember(
  actor: SessionUser,
  projectId: string,
  input: z.infer<typeof addProjectMemberSchema>,
  ipAddress: string | null
) {
  const existing = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(existing !== null, "Project not found.");
  assert(canManageProjectMembers(actor, toScope(existing)), "You don't have permission to manage this project's members.");

  const user = await db.user.findFirst({
    where: { id: input.userId, organizationId: existing.organizationId },
  });
  assert(user !== null, "userId must belong to a user in this organization.");

  const member = await db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: input.userId } },
    create: { projectId, userId: input.userId, roleOnProject: input.roleOnProject },
    update: { roleOnProject: input.roleOnProject },
  });

  await recordAudit({
    userId: actor.id,
    organizationId: existing.organizationId,
    clientId: existing.clientId,
    action: "project.member_added",
    resourceType: "project",
    resourceId: projectId,
    metadata: { userId: input.userId, roleOnProject: input.roleOnProject },
    ipAddress,
  });

  return member;
}

export async function removeProjectMember(
  actor: SessionUser,
  projectId: string,
  userId: string,
  ipAddress: string | null
) {
  const existing = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(existing !== null, "Project not found.");
  assert(canManageProjectMembers(actor, toScope(existing)), "You don't have permission to manage this project's members.");

  await db.projectMember.deleteMany({ where: { projectId, userId } });

  await recordAudit({
    userId: actor.id,
    organizationId: existing.organizationId,
    clientId: existing.clientId,
    action: "project.member_removed",
    resourceType: "project",
    resourceId: projectId,
    metadata: { userId },
    ipAddress,
  });
}

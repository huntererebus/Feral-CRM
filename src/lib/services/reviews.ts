import { db } from "@/lib/db";
import {
  canApproveOrRequestRevision,
  canManageRevisionRequest,
  assert,
  type SessionUser,
  type ProjectScope,
} from "@/lib/rbac";
import { applyProjectStatusTransitionAsSystem } from "@/lib/services/projects";
import { recordAudit } from "@/lib/audit";
import { reviewDecisionSchema, finalApprovalSchema, resolveRevisionRequestSchema } from "@/lib/validation/reviews";
import type { z } from "zod";

export { reviewDecisionSchema, finalApprovalSchema, resolveRevisionRequestSchema } from "@/lib/validation/reviews";

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

async function loadVersionForReview(projectId: string, mediaVersionId: string, expectedKind: "draft" | "final") {
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(project !== null, "Project not found.");

  const version = await db.mediaVersion.findFirst({
    where: { id: mediaVersionId },
    include: { mediaAsset: true },
  });
  assert(version !== null && version.mediaAsset.projectId === projectId, "Media version not found.");
  assert(version.mediaAsset.kind === expectedKind, `Expected a ${expectedKind} media version for this review step.`);
  assert(version.status === "ready", "This version hasn't finished uploading yet.");

  return { project, version };
}

/**
 * The CLIENT_REVIEW decision point: the client either approves the draft
 * (-> FINAL_REVIEW, the internal team now does final QC/export) or requests
 * a revision (-> REVISION_REQUESTED, opening a trackable RevisionRequest
 * the editor addresses). This is the edge left deliberately locked in
 * project-status.ts's PROJECT_STATUS_TRANSITIONS — this function is the
 * only place that's allowed to drive it, via applyProjectStatusTransitionAsSystem.
 */
export async function submitDraftReview(
  actor: SessionUser,
  projectId: string,
  mediaVersionId: string,
  input: z.infer<typeof reviewDecisionSchema>,
  ipAddress: string | null
) {
  const { project, version } = await loadVersionForReview(projectId, mediaVersionId, "draft");
  const scope = toScope(project);

  assert(canApproveOrRequestRevision(actor, scope), "You don't have permission to review this project's draft.");
  assert(
    project.status === "CLIENT_REVIEW",
    `This project isn't awaiting a draft review right now (status: ${project.status}).`
  );

  const approval = await db.approval.create({
    data: {
      mediaVersionId,
      projectId,
      approvedById: actor.id,
      decision: input.decision,
      comment: input.comment ?? null,
    },
  });

  if (input.decision === "approved") {
    await applyProjectStatusTransitionAsSystem(projectId, "FINAL_REVIEW", {
      actorId: actor.id,
      action: "project.status_changed",
      ipAddress,
    });
    await recordAudit({
      userId: actor.id,
      organizationId: project.organizationId,
      clientId: project.clientId,
      action: "review.draft_approved",
      resourceType: "approval",
      resourceId: approval.id,
      metadata: { mediaVersionId },
      ipAddress,
    });
    return { approval, revisionRequest: null };
  }

  // input.comment is guaranteed non-empty here by reviewDecisionSchema's refine.
  const revisionRequest = await db.revisionRequest.create({
    data: {
      mediaVersionId,
      projectId,
      requestedById: actor.id,
      comment: input.comment as string,
      status: "open",
    },
  });

  await applyProjectStatusTransitionAsSystem(projectId, "REVISION_REQUESTED", {
    actorId: actor.id,
    action: "project.status_changed",
    ipAddress,
  });

  await recordAudit({
    userId: actor.id,
    organizationId: project.organizationId,
    clientId: project.clientId,
    action: "review.revision_requested",
    resourceType: "revision_request",
    resourceId: revisionRequest.id,
    metadata: { mediaVersionId },
    ipAddress,
  });

  return { approval, revisionRequest };
}

/**
 * The FINAL_REVIEW decision point: the client signs off on the exported
 * final deliverable (-> APPROVED). Unlike the draft step, there's no
 * client-initiated "request revision" edge out of FINAL_REVIEW on the
 * graph — if the final export doesn't match what was approved as a draft,
 * staff kick it back to CLIENT_REVIEW themselves via the existing generic
 * status-transition endpoint (FINAL_REVIEW -> CLIENT_REVIEW, staff-only),
 * not through this client-facing action.
 */
export async function approveFinalDelivery(
  actor: SessionUser,
  projectId: string,
  mediaVersionId: string,
  input: z.infer<typeof finalApprovalSchema>,
  ipAddress: string | null
) {
  const { project } = await loadVersionForReview(projectId, mediaVersionId, "final");
  const scope = toScope(project);

  assert(canApproveOrRequestRevision(actor, scope), "You don't have permission to approve this project's final delivery.");
  assert(
    project.status === "FINAL_REVIEW",
    `This project isn't awaiting final approval right now (status: ${project.status}).`
  );

  const approval = await db.approval.create({
    data: {
      mediaVersionId,
      projectId,
      approvedById: actor.id,
      decision: "approved",
      comment: input.comment ?? null,
    },
  });

  await applyProjectStatusTransitionAsSystem(projectId, "APPROVED", {
    actorId: actor.id,
    action: "project.status_changed",
    ipAddress,
  });

  await recordAudit({
    userId: actor.id,
    organizationId: project.organizationId,
    clientId: project.clientId,
    action: "review.final_approved",
    resourceType: "approval",
    resourceId: approval.id,
    metadata: { mediaVersionId },
    ipAddress,
  });

  return approval;
}

export async function listRevisionRequests(actor: SessionUser, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(project !== null, "Project not found.");
  assert(canManageRevisionRequest(actor, toScope(project)), "You don't have permission to view revision requests here.");

  return db.revisionRequest.findMany({
    where: { projectId },
    include: { requestedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Staff/editor moves a RevisionRequest through open -> in_progress ->
 * resolved. Not auto-driven by project status: a project can carry more
 * than one open revision note (e.g. several MediaComments' worth of
 * feedback folded into one request, or notes on more than one version),
 * so resolving the note is a distinct, explicit action from the project
 * advancing past REVISION_IN_PROGRESS.
 */
export async function resolveRevisionRequest(
  actor: SessionUser,
  projectId: string,
  revisionRequestId: string,
  input: z.infer<typeof resolveRevisionRequestSchema>,
  ipAddress: string | null
) {
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(project !== null, "Project not found.");
  assert(canManageRevisionRequest(actor, toScope(project)), "You don't have permission to update this revision request.");

  const revisionRequest = await db.revisionRequest.findFirst({ where: { id: revisionRequestId, projectId } });
  assert(revisionRequest !== null, "Revision request not found.");

  if (input.status === "resolved" && input.resolvedByVersionId) {
    const resolvingVersion = await db.mediaVersion.findFirst({
      where: { id: input.resolvedByVersionId },
      include: { mediaAsset: true },
    });
    assert(
      resolvingVersion !== null && resolvingVersion.mediaAsset.projectId === projectId,
      "resolvedByVersionId must reference a media version on this project."
    );
  }

  const updated = await db.revisionRequest.update({
    where: { id: revisionRequestId },
    data: {
      status: input.status,
      resolvedByVersionId: input.status === "resolved" ? input.resolvedByVersionId ?? null : revisionRequest.resolvedByVersionId,
      resolvedAt: input.status === "resolved" ? new Date() : null,
    },
  });

  await recordAudit({
    userId: actor.id,
    organizationId: project.organizationId,
    clientId: project.clientId,
    action: "revision_request.status_changed",
    resourceType: "revision_request",
    resourceId: revisionRequestId,
    metadata: { status: input.status },
    ipAddress,
  });

  return updated;
}

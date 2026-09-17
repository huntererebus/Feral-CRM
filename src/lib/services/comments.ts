import { db } from "@/lib/db";
import {
  canViewMediaAsset,
  canViewComment,
  canPostInternalNote,
  canResolveMediaComment,
  assert,
  type SessionUser,
  type ProjectScope,
} from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { createCommentSchema } from "@/lib/validation/reviews";
import type { z } from "zod";

export { createCommentSchema } from "@/lib/validation/reviews";

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

async function loadVersionForComment(projectId: string, mediaVersionId: string) {
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

  return { project, version };
}

export async function addComment(
  actor: SessionUser,
  projectId: string,
  mediaVersionId: string,
  input: z.infer<typeof createCommentSchema>,
  ipAddress: string | null
) {
  const { project, version } = await loadVersionForComment(projectId, mediaVersionId);
  const scope = toScope(project);

  assert(canViewMediaAsset(actor, scope, version.mediaAsset.kind), "You don't have permission to comment on this media.");

  // A client can never post (or be defaulted into) an internal comment —
  // only staff who can post internal notes get to choose that visibility.
  // Everyone else's comment is client_facing regardless of what they pass.
  const requestedInternal = input.visibility === "internal";
  const visibility = requestedInternal && canPostInternalNote(actor, scope) ? "internal" : "client_facing";

  const comment = await db.mediaComment.create({
    data: {
      mediaVersionId,
      authorId: actor.id,
      body: input.body,
      timestampSeconds: input.timestampSeconds ?? null,
      visibility,
    },
  });

  await recordAudit({
    userId: actor.id,
    organizationId: project.organizationId,
    clientId: project.clientId,
    action: "media_comment.created",
    resourceType: "media_comment",
    resourceId: comment.id,
    metadata: { mediaVersionId, visibility },
    ipAddress,
  });

  return comment;
}

export async function listComments(actor: SessionUser, projectId: string, mediaVersionId: string) {
  const { project, version } = await loadVersionForComment(projectId, mediaVersionId);
  const scope = toScope(project);

  assert(canViewMediaAsset(actor, scope, version.mediaAsset.kind), "You don't have permission to view this media.");

  const comments = await db.mediaComment.findMany({
    where: { mediaVersionId },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Row-level filter, not a query-level `where`, because canViewComment's
  // internal/client_facing rule depends on the actor's role, not just a
  // static column value the DB can filter on cheaply — same trade-off as
  // listProjectMedia's client-side kind filter.
  return comments.filter((c) => canViewComment(actor, scope, c.visibility));
}

export async function resolveComment(
  actor: SessionUser,
  projectId: string,
  mediaVersionId: string,
  commentId: string,
  ipAddress: string | null
) {
  const { project } = await loadVersionForComment(projectId, mediaVersionId);
  assert(canResolveMediaComment(actor, toScope(project)), "You don't have permission to resolve this comment.");

  const comment = await db.mediaComment.findFirst({ where: { id: commentId, mediaVersionId } });
  assert(comment !== null, "Comment not found.");

  const updated = await db.mediaComment.update({ where: { id: commentId }, data: { resolvedAt: new Date() } });

  await recordAudit({
    userId: actor.id,
    organizationId: project.organizationId,
    clientId: project.clientId,
    action: "media_comment.resolved",
    resourceType: "media_comment",
    resourceId: commentId,
    ipAddress,
  });

  return updated;
}

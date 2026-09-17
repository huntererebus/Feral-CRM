import { db } from "@/lib/db";
import { canViewProject, canViewComment, canPostInternalNote, assert, type SessionUser, type ProjectScope } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { sendMessageSchema } from "@/lib/validation/messages";
import type { z } from "zod";

export { sendMessageSchema } from "@/lib/validation/messages";

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

async function loadProjectForMessage(projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(project !== null, "Project not found.");
  return project;
}

export async function sendMessage(
  actor: SessionUser,
  projectId: string,
  input: z.infer<typeof sendMessageSchema>,
  ipAddress: string | null
) {
  const project = await loadProjectForMessage(projectId);
  const scope = toScope(project);

  assert(canViewProject(actor, scope), "You don't have permission to message on this project.");

  // Same rule as comments.ts's addComment: a client can never post (or be
  // defaulted into) internal — only staff who can post internal notes get
  // that visibility, everyone else's message is client_facing regardless
  // of what they request.
  const requestedInternal = input.visibility === "internal";
  const visibility = requestedInternal && canPostInternalNote(actor, scope) ? "internal" : "client_facing";

  if (input.attachmentVersionIds?.length) {
    const count = await db.mediaVersion.count({
      where: { id: { in: input.attachmentVersionIds }, mediaAsset: { projectId } },
    });
    assert(count === input.attachmentVersionIds.length, "One or more attachments don't belong to this project.");
  }

  const message = await db.message.create({
    data: {
      projectId,
      senderId: actor.id,
      body: input.body,
      visibility,
      attachments: input.attachmentVersionIds?.length
        ? { create: input.attachmentVersionIds.map((mediaVersionId) => ({ mediaVersionId })) }
        : undefined,
    },
    include: { attachments: true },
  });

  await recordAudit({
    userId: actor.id,
    organizationId: project.organizationId,
    clientId: project.clientId,
    action: "message.sent",
    resourceType: "message",
    resourceId: message.id,
    metadata: { visibility },
    ipAddress,
  });

  return message;
}

export async function listMessages(actor: SessionUser, projectId: string) {
  const project = await loadProjectForMessage(projectId);
  const scope = toScope(project);

  assert(canViewProject(actor, scope), "You don't have permission to view messages on this project.");

  const messages = await db.message.findMany({
    where: { projectId },
    include: {
      sender: { select: { id: true, name: true, role: true } },
      attachments: { include: { mediaVersion: { select: { id: true, filename: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Row-level filter, same trade-off/reasoning as comments.ts's listComments.
  return messages.filter((m) => canViewComment(actor, scope, m.visibility));
}

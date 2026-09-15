import { db } from "@/lib/db";
import { canInviteRole, assert, type SessionUser, type InvitableRole } from "@/lib/rbac";
import { issueInviteToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/email";
import { recordAudit } from "@/lib/audit";
import { inviteUserSchema } from "@/lib/validation/users";
import type { z } from "zod";

export { inviteUserSchema } from "@/lib/validation/users";

export async function inviteUser(
  actor: SessionUser,
  organizationId: string,
  input: z.infer<typeof inviteUserSchema>,
  orgSlug: string,
  ipAddress: string | null
) {
  const targetRole = input.role as InvitableRole;
  assert(
    canInviteRole(actor, organizationId, targetRole),
    `You don't have permission to invite a user with role "${targetRole}".`
  );

  const existing = await db.user.findUnique({ where: { email: input.email } });
  assert(!existing, "A user with this email already exists.");

  let clientId: string | null = null;
  if (targetRole === "client") {
    const client = await db.client.findFirst({
      where: { id: input.clientId, organizationId, deletedAt: null },
    });
    assert(client !== null, "clientId must reference an active client in this organization.");
    clientId = client.id;
  }

  const organization = await db.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const inviter = await db.user.findUniqueOrThrow({ where: { id: actor.id } });

  const { user, inviteToken } = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: targetRole,
        organizationId,
        clientId,
        status: "invited",
      },
    });
    return { user, inviteToken: await issueInviteToken(user.id) };
  });

  await sendInviteEmail({
    to: user.email,
    inviterName: inviter.name,
    organizationName: organization.name,
    role: targetRole,
    token: inviteToken,
    orgSlug,
  });

  await recordAudit({
    userId: actor.id,
    organizationId,
    clientId,
    action: "user.invited",
    resourceType: "user",
    resourceId: user.id,
    metadata: { role: targetRole, email: user.email },
    ipAddress,
  });

  return user;
}

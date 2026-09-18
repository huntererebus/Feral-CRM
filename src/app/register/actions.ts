"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";
import { getCurrentOrganization } from "@/lib/tenant";

export type ActionResult = { status: "idle" } | { status: "success" } | { status: "error"; message: string };

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

// Mirrors src/app/api/auth/accept-invite/route.ts's logic exactly, same
// reasoning as forgot-password/actions.ts.
export async function registerAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = bodySchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { token, password } = parsed.data;
  const userId = await consumeToken(token, "invite");
  if (!userId) {
    return { status: "error", message: "This invite link is invalid or has expired." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { status: "error", message: "Invited user no longer exists." };
  }

  const org = await getCurrentOrganization();
  const expectedOrgId = user.organizationId;
  if (expectedOrgId ? org?.id !== expectedOrgId : org !== null) {
    return { status: "error", message: "This invite link belongs to a different organization." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, status: "active", emailVerifiedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      clientId: user.clientId,
      action: "user.registered",
      resourceType: "user",
      resourceId: user.id,
    },
  });

  return { status: "success" };
}

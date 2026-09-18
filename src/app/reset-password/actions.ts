"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";

export type ActionResult = { status: "idle" } | { status: "success" } | { status: "error"; message: string };

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(10, "Password must be at least 10 characters"),
});

// Mirrors src/app/api/auth/reset-password/route.ts's logic exactly,
// same reasoning as forgot-password/actions.ts.
export async function resetPasswordAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = bodySchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { token, newPassword } = parsed.data;
  const userId = await consumeToken(token, "password_reset");
  if (!userId) {
    return { status: "error", message: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId } }),
  ]);

  const user = await db.user.findUnique({ where: { id: userId } });
  await db.auditLog.create({
    data: {
      userId,
      organizationId: user?.organizationId ?? null,
      clientId: user?.clientId ?? null,
      action: "user.password_reset",
      resourceType: "user",
      resourceId: userId,
    },
  });

  return { status: "success" };
}

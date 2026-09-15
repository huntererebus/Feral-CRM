import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(10, "Password must be at least 10 characters"),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 422 }
    );
  }

  const { token, newPassword } = parsed.data;
  const userId = await consumeToken(token, "password_reset");

  if (!userId) {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN", message: "This reset link is invalid or has expired." } },
      { status: 422 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Revoke every existing session on password reset — if the reset was
    // triggered because credentials leaked, an attacker's existing session
    // shouldn't survive the password change.
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

  return NextResponse.json({ data: { success: true } });
}

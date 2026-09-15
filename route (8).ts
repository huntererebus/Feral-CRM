import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";
import { getCurrentOrganization } from "@/lib/tenant";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 422 }
    );
  }

  const { token, password } = parsed.data;

  const userId = await consumeToken(token, "invite");
  if (!userId) {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN", message: "This invite link is invalid or has expired." } },
      { status: 422 }
    );
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Invited user no longer exists." } },
      { status: 404 }
    );
  }

  // Registration must happen on the same subdomain the user was invited to
  // (or the base domain, for a platform_admin invite) — otherwise this
  // endpoint becomes a way to complete an account from the wrong tenant
  // context.
  const org = await getCurrentOrganization();
  const expectedOrgId = user.organizationId;
  if (expectedOrgId ? org?.id !== expectedOrgId : org !== null) {
    return NextResponse.json(
      { error: { code: "TENANT_MISMATCH", message: "This invite link belongs to a different organization." } },
      { status: 422 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    },
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

  return NextResponse.json({ data: { success: true } });
}

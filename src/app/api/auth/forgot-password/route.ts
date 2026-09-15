import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { issuePasswordResetToken } from "@/lib/tokens";
import { getCurrentOrganization } from "@/lib/tenant";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request." } },
      { status: 422 }
    );
  }

  // TODO(stage 11 - hardening): rate limit this endpoint per IP and per
  // email (Section 10) — deferred until the Upstash-backed limiter lands,
  // but the endpoint shape below is written to not need changes then.

  const { email } = parsed.data;
  const org = await getCurrentOrganization();

  const user = await db.user.findUnique({ where: { email } });

  // Always return the same generic response whether or not the user
  // exists, or belongs to this org, or is a platform_admin (who can't
  // reset via a tenant subdomain at all) — this is what "no user
  // enumeration" means in practice, not just on the happy path.
  const genericResponse = NextResponse.json({
    data: { message: "If an account exists for that email, a reset link has been sent." },
  });

  if (!user) return genericResponse;
  if (user.role === "platform_admin") return genericResponse; // platform admin resets are handled out-of-band, not via a tenant subdomain
  if (!org || user.organizationId !== org.id) return genericResponse;

  const token = await issuePasswordResetToken(user.id);
  await sendPasswordResetEmail({
    to: user.email,
    organizationName: org.name,
    token,
    orgSlug: org.slug,
  });

  return genericResponse;
}

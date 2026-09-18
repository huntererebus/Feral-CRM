"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { issuePasswordResetToken } from "@/lib/tokens";
import { getCurrentOrganization } from "@/lib/tenant";
import { sendPasswordResetEmail } from "@/lib/email";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const GENERIC_MESSAGE = "If an account exists for that email, a reset link has been sent.";

const bodySchema = z.object({ email: z.string().email() });

// Mirrors src/app/api/auth/forgot-password/route.ts's logic exactly (same
// no-enumeration behavior, same token/email primitives) — a server action
// rather than this form fetching its own app's API route over HTTP, since
// there's no reason to round-trip through the network for same-process
// logic. Not new business logic; the API route stays the source of truth
// for the actual rule ("always return the generic response") and this
// copies it, not reinterprets it.
export async function forgotPasswordAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = bodySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const { email } = parsed.data;
  const org = await getCurrentOrganization();
  const user = await db.user.findUnique({ where: { email } });

  if (user && user.role !== "platform_admin" && org && user.organizationId === org.id) {
    const token = await issuePasswordResetToken(user.id);
    await sendPasswordResetEmail({ to: user.email, organizationName: org.name, token, orgSlug: org.slug });
  }

  return { ok: true, message: GENERIC_MESSAGE };
}

"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function loginAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  let signInResult: Awaited<ReturnType<typeof signIn>>;
  try {
    // redirect: false — we decide where to send the user ourselves below,
    // based on whether this login resolved against an org subdomain (any
    // non-platform_admin role) or the base domain (platform_admin only;
    // see auth.ts's own login-time check). signIn still sets the session
    // cookie with redirect: false, it just skips issuing the HTTP redirect.
    signInResult = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, message: "Incorrect email or password." };
    }
    throw err;
  }

  if (!signInResult || signInResult.error) {
    return { ok: false, message: "Incorrect email or password." };
  }

  const org = await getCurrentOrganization();
  redirect(org ? "/org-admin/projects" : "/platform-admin/organizations");
}

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

export async function oauthSignInAction(provider: "google" | "apple") {
  // Where the user lands is decided by the tenant context they initiated
  // from, not anything OAuth returns — auth.ts's signIn() callback only
  // lets this succeed at all when the account belongs to the org on this
  // subdomain (or is a platform_admin on the base domain), so a successful
  // callback always means the same destination the credentials flow above
  // would have picked.
  const org = await getCurrentOrganization();
  await signIn(provider, { redirectTo: org ? "/org-admin/projects" : "/platform-admin/organizations" });
}

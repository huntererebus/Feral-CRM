// Stub email layer. Every call site codes against this interface now so
// swapping the body for a real Resend call (planning-doc.md Section 9) in
// the notifications stage touches this one file, not every call site.
// Logs instead of sending — never silently drops the content, so it's
// still useful for local dev/testing before the real provider is wired in.

export async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  token: string;
  orgSlug: string | null; // null for a platform_admin invite (base domain)
}) {
  const host = params.orgSlug
    ? `${params.orgSlug}.${process.env.APP_BASE_DOMAIN_DEV ?? process.env.APP_BASE_DOMAIN}`
    : process.env.APP_BASE_DOMAIN_DEV ?? process.env.APP_BASE_DOMAIN;
  const link = `http://${host}/register?token=${params.token}`;
  console.log(
    `[email stub] invite for ${params.to} (${params.role}) to ${params.organizationName}, invited by ${params.inviterName}: ${link}`
  );
}

export async function sendPasswordResetEmail(params: {
  to: string;
  organizationName: string;
  token: string;
  orgSlug: string | null;
}) {
  const host = params.orgSlug
    ? `${params.orgSlug}.${process.env.APP_BASE_DOMAIN_DEV ?? process.env.APP_BASE_DOMAIN}`
    : process.env.APP_BASE_DOMAIN_DEV ?? process.env.APP_BASE_DOMAIN;
  const link = `http://${host}/reset-password?token=${params.token}`;
  console.log(`[email stub] password reset for ${params.to} at ${params.organizationName}: ${link}`);
}

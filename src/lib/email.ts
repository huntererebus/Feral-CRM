import { Resend } from "resend";

// Lazy singleton, same reasoning as storage.ts's getR2Client() — constructed
// once, not at module-import time, so importing this file doesn't require
// RESEND_API_KEY to be set if nothing on that code path actually sends.
let client: Resend | undefined;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null; // not configured — sendEmail() falls back to logging
  if (!client) client = new Resend(apiKey);
  return client;
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? "Reel <notifications@reel.app>";

/**
 * The one place that actually talks to Resend. Never throws on a missing
 * API key — local dev, CI, and this build sandbox don't have one, and the
 * original Stage 2 stub's promise ("logs instead of sending — never
 * silently drops the content") still holds: every call site below still
 * gets a usable link in its console output either way.
 */
async function sendEmail(params: { to: string; subject: string; html: string; logFallback: string }): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.log(`[email stub] ${params.logFallback}`);
    return;
  }
  await resend.emails.send({ from: FROM_ADDRESS, to: params.to, subject: params.subject, html: params.html });
}

function resolveHost(orgSlug: string | null): string | undefined {
  const base = process.env.APP_BASE_DOMAIN_DEV ?? process.env.APP_BASE_DOMAIN;
  return orgSlug ? `${orgSlug}.${base}` : base;
}

export async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  token: string;
  orgSlug: string | null; // null for a platform_admin invite (base domain)
}) {
  const link = `http://${resolveHost(params.orgSlug)}/register?token=${params.token}`;
  await sendEmail({
    to: params.to,
    subject: `You've been invited to ${params.organizationName}`,
    html: `<p>${params.inviterName} invited you to join ${params.organizationName} as ${params.role}.</p><p><a href="${link}">Accept invite</a></p>`,
    logFallback: `invite for ${params.to} (${params.role}) to ${params.organizationName}, invited by ${params.inviterName}: ${link}`,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  organizationName: string;
  token: string;
  orgSlug: string | null;
}) {
  const link = `http://${resolveHost(params.orgSlug)}/reset-password?token=${params.token}`;
  await sendEmail({
    to: params.to,
    subject: `Reset your password for ${params.organizationName}`,
    html: `<p>Reset your password for ${params.organizationName}.</p><p><a href="${link}">Reset password</a></p>`,
    logFallback: `password reset for ${params.to} at ${params.organizationName}: ${link}`,
  });
}

/**
 * The one generic transactional email for in-app Notification events (see
 * services/notifications.ts). Deliberately not a bespoke template per event
 * type — Notification already carries title/body/linkUrl, and this reuses
 * that instead of building a template system before there's a real reason
 * to need one. orgSlug is passed straight through so the link lands on the
 * right tenant subdomain, same as the two functions above.
 */
export async function sendNotificationEmail(params: {
  to: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  orgSlug: string | null;
}) {
  const host = resolveHost(params.orgSlug);
  const link = params.linkPath ? `http://${host}${params.linkPath}` : undefined;
  await sendEmail({
    to: params.to,
    subject: params.title,
    html: `<p>${params.title}</p>${params.body ? `<p>${params.body}</p>` : ""}${link ? `<p><a href="${link}">View</a></p>` : ""}`,
    logFallback: `notification for ${params.to}: ${params.title}${link ? ` — ${link}` : ""}`,
  });
}

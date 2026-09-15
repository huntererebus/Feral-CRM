import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/tenant";
import type { SessionUser } from "@/lib/rbac";

export class UnauthenticatedError extends Error {}
export class TenantMismatchError extends Error {}

/**
 * The single entry point every API route/server action should use instead
 * of calling `auth()` directly. It re-derives the request's organization
 * context and cross-checks it against the session user — isolation check
 * #2 of 3 (Section 10). Check #1 happens at login (src/lib/auth.ts, a user
 * can't even establish a session against the wrong org's subdomain); check
 * #3 is the database RLS layer (prisma/rls.sql).
 *
 * Throws rather than silently returning null on any mismatch — a caller
 * should never accidentally treat "wrong org" the same as "not logged in."
 */
export async function requireSession(): Promise<{
  user: SessionUser;
  organizationId: string | null; // null only for a platform_admin on the base domain
}> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthenticatedError();
  }

  const user: SessionUser = {
    id: session.user.id,
    role: session.user.role,
    organizationId: session.user.organizationId,
    clientId: session.user.clientId,
  };

  const org = await getCurrentOrganization();

  if (user.role === "platform_admin") {
    // Platform admins are expected on the base domain (org === null) for
    // their own console, and may also resolve org-scoped data explicitly
    // via /platform/organizations/:id endpoints rather than by browsing a
    // tenant subdomain directly.
    return { user, organizationId: org?.id ?? null };
  }

  if (!org || user.organizationId !== org.id) {
    throw new TenantMismatchError(
      "Session's organization does not match the resolved request organization"
    );
  }

  return { user, organizationId: org.id };
}

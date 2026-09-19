import type { Organization, Role } from "@prisma/client";

/**
 * The two-tier isolation check (Section 10): a sign-in on an org's
 * subdomain must belong to that org, or be a platform admin on the base
 * domain. Shared by auth.ts's credentials authorize() and its OAuth
 * signIn() callback so the two paths can't drift apart — this is the
 * single check that decides whether a session gets established at all,
 * before any per-request app-layer check ever runs.
 *
 * Deliberately its own module, not defined inline in auth.ts: auth.ts
 * transitively imports db.ts, which instantiates PrismaClient at module
 * load time — fine at runtime, but it means anything importing auth.ts
 * directly (including a test importing just this function) requires a
 * generated Prisma client to even load. Keeping this pure and dependency-free
 * lets it be unit-tested (tests/auth.test.ts) independent of that.
 */
export function isUserAllowedInTenant(
  user: { role: Role; organizationId: string | null },
  org: Organization | null
): boolean {
  if (user.role === "platform_admin") return org === null;
  return org !== null && user.organizationId === org.id;
}

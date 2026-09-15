import { cache } from "react";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { Organization } from "@prisma/client";

export class TenantResolutionError extends Error {}

/**
 * Resolves the current request's Organization from the header set by
 * src/middleware.ts. `cache()` ensures this only hits the database once per
 * request even if called from multiple server components.
 *
 * Returns null on the base domain (platform-admin surface, no org context).
 * Throws if a subdomain was presented but doesn't match any organization,
 * or matches one that's suspended — callers should let this propagate into
 * a 404/error boundary rather than quietly falling back to "no org," since
 * silently ignoring an unresolvable org is exactly the kind of gap that
 * causes cross-tenant confusion.
 */
export const getCurrentOrganization = cache(
  async (): Promise<Organization | null> => {
    const slug = headers().get("x-org-slug");
    if (!slug) return null;

    const org = await db.organization.findUnique({ where: { slug } });

    if (!org) {
      throw new TenantResolutionError(`No organization found for slug "${slug}"`);
    }
    if (org.status === "suspended") {
      throw new TenantResolutionError(`Organization "${slug}" is suspended`);
    }

    return org;
  }
);

/** Convenience for code paths that require an org to exist (nearly everything
 * under /app). Throws the same way getCurrentOrganization does on failure,
 * plus explicitly when no org was resolved at all (base-domain request). */
export async function requireCurrentOrganization(): Promise<Organization> {
  const org = await getCurrentOrganization();
  if (!org) {
    throw new TenantResolutionError("Request has no organization context");
  }
  return org;
}

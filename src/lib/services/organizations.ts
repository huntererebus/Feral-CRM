import { db } from "@/lib/db";
import { RESERVED_SLUGS } from "@/lib/constants";
import { isPlatformAdmin, canManageOrgSettings, assert, type SessionUser } from "@/lib/rbac";
import { issueInviteToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/email";
import { recordAudit } from "@/lib/audit";
import {
  createOrganizationSchema,
  updateOrganizationStatusSchema,
  updateOrgSettingsSchema,
} from "@/lib/validation/organizations";
import type { z } from "zod";

export {
  createOrganizationSchema,
  updateOrganizationStatusSchema,
  updateOrgSettingsSchema,
} from "@/lib/validation/organizations";

/**
 * Creates a new agency and invites its first org_admin, atomically. This is
 * intentionally one operation rather than two, since an organization with
 * no admin is a dead end nobody can recover from through the app itself.
 */
export async function createOrganization(
  actor: SessionUser,
  input: z.infer<typeof createOrganizationSchema>,
  ipAddress: string | null
) {
  assert(isPlatformAdmin(actor), "Only platform administrators can create organizations.");

  const slug = input.slug.toLowerCase();
  assert(!RESERVED_SLUGS.has(slug), `"${slug}" is a reserved subdomain and can't be used.`);

  const existing = await db.organization.findUnique({ where: { slug } });
  assert(!existing, `The subdomain "${slug}" is already in use.`);

  const { organization, adminUser, inviteToken } = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.name, slug, status: "trial" },
    });

    const adminUser = await tx.user.create({
      data: {
        email: input.adminEmail,
        name: input.adminName,
        role: "org_admin",
        organizationId: organization.id,
        status: "invited",
      },
    });

    return { organization, adminUser, inviteToken: await issueInviteToken(adminUser.id) };
  });

  await sendInviteEmail({
    to: adminUser.email,
    inviterName: actor.id, // platform admin acting on behalf of the platform, not a named org member
    organizationName: organization.name,
    role: "org_admin",
    token: inviteToken,
    orgSlug: organization.slug,
  });

  await recordAudit({
    userId: actor.id,
    organizationId: organization.id,
    action: "organization.created",
    resourceType: "organization",
    resourceId: organization.id,
    metadata: { adminEmail: adminUser.email },
    ipAddress,
  });

  return organization;
}

export async function listOrganizations(actor: SessionUser) {
  assert(isPlatformAdmin(actor), "Only platform administrators can list organizations.");
  return db.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      _count: { select: { clients: true, projects: true } },
    },
  });
}

export async function getOrganization(actor: SessionUser, organizationId: string) {
  assert(isPlatformAdmin(actor), "Only platform administrators can view organization detail here.");
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  assert(org !== null, "Organization not found.");
  return org;
}

export async function updateOrganizationStatus(
  actor: SessionUser,
  organizationId: string,
  input: z.infer<typeof updateOrganizationStatusSchema>,
  ipAddress: string | null
) {
  assert(isPlatformAdmin(actor), "Only platform administrators can change organization status.");

  const org = await db.organization.update({
    where: { id: organizationId },
    data: { status: input.status },
  });

  await recordAudit({
    userId: actor.id,
    organizationId,
    action: "organization.status_changed",
    resourceType: "organization",
    resourceId: organizationId,
    metadata: { status: input.status },
    ipAddress,
  });

  return org;
}

// --- Org-admin-facing branding settings ----------------------------------------

export async function getOrgSettings(actor: SessionUser, organizationId: string) {
  // Any authenticated member of the org can read branding (it's what
  // renders their own shell) — only org_admin can write it.
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  assert(org !== null, "Organization not found.");
  return org;
}

export async function updateOrgSettings(
  actor: SessionUser,
  organizationId: string,
  input: z.infer<typeof updateOrgSettingsSchema>,
  ipAddress: string | null
) {
  assert(canManageOrgSettings(actor, organizationId), "Only an org admin can change organization settings.");

  const org = await db.organization.update({
    where: { id: organizationId },
    data: input,
  });

  await recordAudit({
    userId: actor.id,
    organizationId,
    action: "organization.settings_updated",
    resourceType: "organization",
    resourceId: organizationId,
    metadata: input as Record<string, unknown>,
    ipAddress,
  });

  return org;
}

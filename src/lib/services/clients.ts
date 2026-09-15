import { db } from "@/lib/db";
import {
  canManageClients,
  canViewClient,
  assert,
  type SessionUser,
} from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { createClientSchema, updateClientSchema, createContactSchema } from "@/lib/validation/clients";
import type { z } from "zod";

export { createClientSchema, updateClientSchema, createContactSchema } from "@/lib/validation/clients";

export async function createClient(
  actor: SessionUser,
  organizationId: string,
  input: z.infer<typeof createClientSchema>,
  ipAddress: string | null
) {
  assert(canManageClients(actor, { organizationId }), "You don't have permission to create clients.");

  if (input.accountManagerId) {
    const am = await db.user.findFirst({
      where: { id: input.accountManagerId, organizationId, role: "account_manager" },
    });
    assert(am !== null, "accountManagerId must be an account manager in this organization.");
  }

  const client = await db.client.create({
    data: {
      organizationId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      accountManagerId: input.accountManagerId ?? null,
      notes: input.notes ?? null,
      status: "active",
    },
  });

  await recordAudit({
    userId: actor.id,
    organizationId,
    clientId: client.id,
    action: "client.created",
    resourceType: "client",
    resourceId: client.id,
    ipAddress,
  });

  return client;
}

export async function listClients(actor: SessionUser, organizationId: string) {
  // Every staff role that can reach the client list at all sees the org's
  // full client set per the permissions matrix (Section 2) — editors and
  // clients never call this (they don't have a "browse clients" surface).
  assert(
    canManageClients(actor, { organizationId }) || actor.role === "org_admin",
    "You don't have permission to view the client list."
  );

  return db.client.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      accountManager: { select: { id: true, name: true } },
      _count: { select: { projects: true, contacts: true } },
    },
  });
}

export async function getClient(actor: SessionUser, clientId: string) {
  const client = await db.client.findFirst({
    where: { id: clientId, deletedAt: null },
    include: { accountManager: { select: { id: true, name: true } }, contacts: true },
  });
  assert(client !== null, "Client not found.");
  assert(canViewClient(actor, client), "You don't have permission to view this client.");
  return client;
}

export async function updateClient(
  actor: SessionUser,
  clientId: string,
  input: z.infer<typeof updateClientSchema>,
  ipAddress: string | null
) {
  const existing = await db.client.findFirst({ where: { id: clientId, deletedAt: null } });
  assert(existing !== null, "Client not found.");
  assert(canManageClients(actor, existing), "You don't have permission to edit this client.");

  const client = await db.client.update({ where: { id: clientId }, data: input });

  await recordAudit({
    userId: actor.id,
    organizationId: existing.organizationId,
    clientId,
    action: "client.updated",
    resourceType: "client",
    resourceId: clientId,
    metadata: input as Record<string, unknown>,
    ipAddress,
  });

  return client;
}

export async function archiveClient(actor: SessionUser, clientId: string, ipAddress: string | null) {
  const existing = await db.client.findFirst({ where: { id: clientId, deletedAt: null } });
  assert(existing !== null, "Client not found.");
  assert(canManageClients(actor, existing), "You don't have permission to archive this client.");

  // Soft delete only — see planning-doc.md Section 6: client media has
  // audit/legal-hold expectations that rule out hard delete here.
  const client = await db.client.update({
    where: { id: clientId },
    data: { deletedAt: new Date(), status: "archived" },
  });

  await recordAudit({
    userId: actor.id,
    organizationId: existing.organizationId,
    clientId,
    action: "client.archived",
    resourceType: "client",
    resourceId: clientId,
    ipAddress,
  });

  return client;
}

// --- Contacts --------------------------------------------------------------------

export async function listContacts(actor: SessionUser, clientId: string) {
  const client = await db.client.findFirst({ where: { id: clientId, deletedAt: null } });
  assert(client !== null, "Client not found.");
  assert(canViewClient(actor, client), "You don't have permission to view this client's contacts.");

  return db.contact.findMany({ where: { clientId }, orderBy: { isPrimary: "desc" } });
}

export async function createContact(
  actor: SessionUser,
  clientId: string,
  input: z.infer<typeof createContactSchema>,
  ipAddress: string | null
) {
  const client = await db.client.findFirst({ where: { id: clientId, deletedAt: null } });
  assert(client !== null, "Client not found.");
  assert(canManageClients(actor, client), "You don't have permission to add contacts to this client.");

  if (input.isPrimary) {
    // Only one primary contact per client — demote any existing one rather
    // than allow an ambiguous state.
    await db.contact.updateMany({ where: { clientId, isPrimary: true }, data: { isPrimary: false } });
  }

  const contact = await db.contact.create({
    data: {
      clientId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      title: input.title ?? null,
      isPrimary: input.isPrimary ?? false,
    },
  });

  await recordAudit({
    userId: actor.id,
    organizationId: client.organizationId,
    clientId,
    action: "contact.created",
    resourceType: "contact",
    resourceId: contact.id,
    ipAddress,
  });

  return contact;
}

import { db } from "@/lib/db";
import { assert, type SessionUser } from "@/lib/rbac";
import { notificationRuleForStatus, type ProjectStatusNotificationRule } from "@/lib/project-notifications";
import { sendNotificationEmail } from "@/lib/email";
import type { ProjectStatus, Role } from "@prisma/client";

async function createNotification(
  userId: string,
  input: { type: string; title: string; body?: string | null; linkUrl?: string | null }
) {
  return db.notification.create({
    data: { userId, type: input.type, title: input.title, body: input.body ?? null, linkUrl: input.linkUrl ?? null },
  });
}

/**
 * Resolves a rule's role-relative `notifyRoles` (e.g. "editor") to actual
 * recipient user rows for one specific project. Deliberately conservative
 * where a project-level assignment is unset — e.g. "account_manager" with
 * no accountManagerId configured notifies nobody rather than falling back
 * to every account manager in the org, to avoid surprising, noisy
 * broadcast notifications for a case that's really just missing data.
 */
async function resolveRecipients(
  project: { organizationId: string; clientId: string; editorId: string | null; accountManagerId: string | null },
  role: Role
): Promise<{ id: string; email: string; name: string }[]> {
  switch (role) {
    case "editor":
      if (!project.editorId) return [];
      return db.user.findMany({ where: { id: project.editorId, deletedAt: null }, select: { id: true, email: true, name: true } });
    case "account_manager":
      if (!project.accountManagerId) return [];
      return db.user.findMany({
        where: { id: project.accountManagerId, deletedAt: null },
        select: { id: true, email: true, name: true },
      });
    case "client":
      return db.user.findMany({
        where: { clientId: project.clientId, role: "client", deletedAt: null },
        select: { id: true, email: true, name: true },
      });
    default:
      // org_admin/platform_admin aren't used by any current rule; kept
      // exhaustive rather than throwing so a future rule using them
      // degrades to "nobody notified" instead of an error.
      return [];
  }
}

async function deliverNotification(
  recipient: { id: string; email: string; name: string },
  rule: ProjectStatusNotificationRule,
  project: { id: string; name: string; organizationId: string },
  orgSlug: string | null,
  isStaffRecipient: boolean
) {
  const title = rule.buildTitle(project.name);
  const linkUrl = isStaffRecipient ? `/org-admin/projects/${project.id}` : null;

  await createNotification(recipient.id, { type: rule.type, title, linkUrl });

  if (rule.sendEmail) {
    await sendNotificationEmail({
      to: recipient.email,
      title,
      body: null,
      // Client portal routes don't exist yet (Stage 8) — the email still
      // informs the client, just without a deep link for now.
      linkPath: isStaffRecipient ? linkUrl : null,
      orgSlug,
    });
  }
}

/**
 * Called from exactly one place: projects.ts's applyStatusChange, right
 * after a status change commits. Every status-changing code path (the
 * generic endpoint, the review flow's system transitions) funnels through
 * that one function, so hooking notifications there means no service ever
 * has to remember to notify anyone itself.
 */
export async function notifyProjectStatusChange(
  project: {
    id: string;
    name: string;
    organizationId: string;
    clientId: string;
    editorId: string | null;
    accountManagerId: string | null;
  },
  toStatus: ProjectStatus
): Promise<void> {
  const rule = notificationRuleForStatus(toStatus);
  if (!rule) return;

  const organization = rule.sendEmail
    ? await db.organization.findUnique({ where: { id: project.organizationId }, select: { slug: true } })
    : null;

  for (const role of rule.notifyRoles) {
    const recipients = await resolveRecipients(project, role);
    const isStaffRecipient = role !== "client";
    for (const recipient of recipients) {
      await deliverNotification(recipient, rule, project, organization?.slug ?? null, isStaffRecipient);
    }
  }
}

export async function listNotifications(actor: SessionUser, filters?: { unreadOnly?: boolean }) {
  return db.notification.findMany({
    where: { userId: actor.id, ...(filters?.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationRead(actor: SessionUser, notificationId: string) {
  const result = await db.notification.updateMany({
    where: { id: notificationId, userId: actor.id },
    data: { readAt: new Date() },
  });
  assert(result.count > 0, "Notification not found.");
  return db.notification.findFirst({ where: { id: notificationId } });
}

export async function markAllNotificationsRead(actor: SessionUser) {
  await db.notification.updateMany({ where: { userId: actor.id, readAt: null }, data: { readAt: new Date() } });
}

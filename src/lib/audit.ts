import { db } from "@/lib/db";

type RecordAuditInput = {
  userId: string | null;
  organizationId: string | null;
  clientId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

/**
 * Append-only by convention (see the note on the AuditLog model itself) —
 * this function only ever creates rows, never updates or deletes them.
 * Deliberately swallows its own errors after logging them: an audit-log
 * write failing should never take down the user-facing action it's
 * recording.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        clientId: input.clientId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata ?? undefined,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", input.action, err);
  }
}

/** Best-effort client IP extraction from standard proxy headers. */
export function getRequestIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

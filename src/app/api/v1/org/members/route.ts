import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, jsonError, withRouteErrorHandling } from "@/lib/api-response";
import { listOrgMembers } from "@/lib/services/users";

export const runtime = "nodejs";

export const GET = withRouteErrorHandling(async (request: NextRequest) => {
  const { user, organizationId } = await requireSession();
  if (!organizationId) return jsonError("NOT_APPLICABLE", "No organization context.", 400);

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as "org_admin" | "account_manager" | "editor" | null;

  const members = await listOrgMembers(user, organizationId, role ? { role } : undefined);
  return jsonOk(members);
});

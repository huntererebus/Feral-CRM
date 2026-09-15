import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, jsonError, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { requireCurrentOrganization } from "@/lib/tenant";
import { inviteUserSchema, inviteUser } from "@/lib/services/users";

export const runtime = "nodejs";

export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const { user, organizationId } = await requireSession();
  if (!organizationId) {
    return jsonError("NOT_APPLICABLE", "Invites are sent from within an organization's subdomain.", 400);
  }
  const org = await requireCurrentOrganization();
  const input = inviteUserSchema.parse(await request.json());
  const invited = await inviteUser(user, organizationId, input, org.slug, getRequestIp(request));
  return jsonOk(invited, { status: 201 });
});

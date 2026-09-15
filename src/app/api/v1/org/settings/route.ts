import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, jsonError, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { getOrgSettings, updateOrgSettings, updateOrgSettingsSchema } from "@/lib/services/organizations";

export const runtime = "nodejs";

export const GET = withRouteErrorHandling(async () => {
  const { user, organizationId } = await requireSession();
  if (!organizationId) {
    return jsonError("NOT_APPLICABLE", "Platform admins on the base domain have no organization settings.", 400);
  }
  const org = await getOrgSettings(user, organizationId);
  return jsonOk(org);
});

export const PATCH = withRouteErrorHandling(async (request: NextRequest) => {
  const { user, organizationId } = await requireSession();
  if (!organizationId) {
    return jsonError("NOT_APPLICABLE", "Platform admins on the base domain have no organization settings.", 400);
  }
  const input = updateOrgSettingsSchema.parse(await request.json());
  const org = await updateOrgSettings(user, organizationId, input, getRequestIp(request));
  return jsonOk(org);
});

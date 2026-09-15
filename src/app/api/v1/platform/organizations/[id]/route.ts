import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import {
  getOrganization,
  updateOrganizationStatus,
  updateOrganizationStatusSchema,
} from "@/lib/services/organizations";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const org = await getOrganization(user, params.id);
  return jsonOk(org);
});

export const PATCH = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = updateOrganizationStatusSchema.parse(await request.json());
  const org = await updateOrganizationStatus(user, params.id, input, getRequestIp(request));
  return jsonOk(org);
});

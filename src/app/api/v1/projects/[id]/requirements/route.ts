import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import {
  getProjectRequirements,
  upsertProjectRequirements,
  upsertProjectRequirementsSchema,
} from "@/lib/services/projects";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const requirements = await getProjectRequirements(user, params.id);
  return jsonOk(requirements);
});

export const PUT = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = upsertProjectRequirementsSchema.parse(await request.json());
  const requirements = await upsertProjectRequirements(user, params.id, input, getRequestIp(request));
  return jsonOk(requirements);
});

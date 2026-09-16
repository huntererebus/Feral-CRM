import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { removeProjectMember } from "@/lib/services/projects";

export const runtime = "nodejs";

type RouteParams = { params: { id: string; userId: string } };

export const DELETE = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  await removeProjectMember(user, params.id, params.userId, getRequestIp(request));
  return jsonOk({ success: true });
});

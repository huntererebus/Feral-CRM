import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { resolveComment } from "@/lib/services/comments";

export const runtime = "nodejs";

type RouteParams = { params: { id: string; versionId: string; commentId: string } };

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const comment = await resolveComment(user, params.id, params.versionId, params.commentId, getRequestIp(request));
  return jsonOk(comment);
});

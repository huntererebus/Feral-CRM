import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { resolveRevisionRequest, resolveRevisionRequestSchema } from "@/lib/services/reviews";

export const runtime = "nodejs";

type RouteParams = { params: { id: string; revisionRequestId: string } };

export const PATCH = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = resolveRevisionRequestSchema.parse(await request.json());
  const revisionRequest = await resolveRevisionRequest(
    user,
    params.id,
    params.revisionRequestId,
    input,
    getRequestIp(request)
  );
  return jsonOk(revisionRequest);
});

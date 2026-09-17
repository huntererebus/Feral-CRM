import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { submitDraftReview, reviewDecisionSchema } from "@/lib/services/reviews";

export const runtime = "nodejs";

type RouteParams = { params: { id: string; versionId: string } };

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = reviewDecisionSchema.parse(await request.json());
  const result = await submitDraftReview(user, params.id, params.versionId, input, getRequestIp(request));
  return jsonOk(result, { status: 201 });
});

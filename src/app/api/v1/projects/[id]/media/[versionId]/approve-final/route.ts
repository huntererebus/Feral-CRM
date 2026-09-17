import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { approveFinalDelivery, finalApprovalSchema } from "@/lib/services/reviews";

export const runtime = "nodejs";

type RouteParams = { params: { id: string; versionId: string } };

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = finalApprovalSchema.parse(await request.json().catch(() => ({})));
  const approval = await approveFinalDelivery(user, params.id, params.versionId, input, getRequestIp(request));
  return jsonOk(approval, { status: 201 });
});

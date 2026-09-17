import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { listRevisionRequests } from "@/lib/services/reviews";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const revisionRequests = await listRevisionRequests(user, params.id);
  return jsonOk(revisionRequests);
});

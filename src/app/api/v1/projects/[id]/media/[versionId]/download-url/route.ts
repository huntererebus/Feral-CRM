import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getMediaDownloadUrl } from "@/lib/services/media";

export const runtime = "nodejs";

type RouteParams = { params: { id: string; versionId: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const result = await getMediaDownloadUrl(user, params.id, params.versionId);
  return jsonOk(result);
});

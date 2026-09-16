import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { confirmMediaUpload, confirmMediaUploadSchema } from "@/lib/services/media";

export const runtime = "nodejs";

type RouteParams = { params: { id: string; versionId: string } };

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = confirmMediaUploadSchema.parse(await request.json().catch(() => ({})));
  const version = await confirmMediaUpload(user, params.id, params.versionId, input, getRequestIp(request));
  return jsonOk(version);
});

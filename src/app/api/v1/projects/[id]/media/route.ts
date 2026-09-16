import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { listProjectMedia, initiateMediaUpload, initiateMediaUploadSchema } from "@/lib/services/media";
import { mediaKindSchema } from "@/lib/validation/media";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const GET = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const { searchParams } = new URL(request.url);
  const rawKind = searchParams.get("kind");
  const kind = rawKind ? mediaKindSchema.parse(rawKind) : undefined;

  const media = await listProjectMedia(user, params.id, { kind });
  return jsonOk(media);
});

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = initiateMediaUploadSchema.parse(await request.json());
  const result = await initiateMediaUpload(user, params.id, input, getRequestIp(request));
  return jsonOk(result, { status: 201 });
});

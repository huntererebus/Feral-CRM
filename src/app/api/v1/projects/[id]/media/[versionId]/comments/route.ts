import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { listComments, addComment, createCommentSchema } from "@/lib/services/comments";

export const runtime = "nodejs";

type RouteParams = { params: { id: string; versionId: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const comments = await listComments(user, params.id, params.versionId);
  return jsonOk(comments);
});

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = createCommentSchema.parse(await request.json());
  const comment = await addComment(user, params.id, params.versionId, input, getRequestIp(request));
  return jsonOk(comment, { status: 201 });
});

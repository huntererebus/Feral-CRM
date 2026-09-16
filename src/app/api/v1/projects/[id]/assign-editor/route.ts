import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { assignEditor, assignEditorSchema } from "@/lib/services/projects";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = assignEditorSchema.parse(await request.json());
  const project = await assignEditor(user, params.id, input, getRequestIp(request));
  return jsonOk(project);
});

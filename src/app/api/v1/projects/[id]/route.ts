import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { getProject, updateProject, updateProjectSchema, deleteProject } from "@/lib/services/projects";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const project = await getProject(user, params.id);
  return jsonOk(project);
});

export const PATCH = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = updateProjectSchema.parse(await request.json());
  const project = await updateProject(user, params.id, input, getRequestIp(request));
  return jsonOk(project);
});

export const DELETE = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  await deleteProject(user, params.id, getRequestIp(request));
  return jsonOk({ success: true });
});

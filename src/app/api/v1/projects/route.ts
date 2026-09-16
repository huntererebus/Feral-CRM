import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, jsonError, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { createProjectSchema, createProject, listProjects } from "@/lib/services/projects";
import { projectStatusSchema } from "@/lib/validation/projects";

export const runtime = "nodejs";

export const GET = withRouteErrorHandling(async (request: NextRequest) => {
  const { user, organizationId } = await requireSession();
  if (!organizationId) return jsonError("NOT_APPLICABLE", "No organization context.", 400);

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ?? undefined;
  const rawStatus = searchParams.get("status");
  const status = rawStatus ? projectStatusSchema.parse(rawStatus) : undefined;

  const projects = await listProjects(user, organizationId, { clientId, status });
  return jsonOk(projects);
});

export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const { user, organizationId } = await requireSession();
  if (!organizationId) return jsonError("NOT_APPLICABLE", "No organization context.", 400);

  const input = createProjectSchema.parse(await request.json());
  const project = await createProject(user, organizationId, input, getRequestIp(request));
  return jsonOk(project, { status: 201 });
});

import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { listProjectMembers, addProjectMember, addProjectMemberSchema } from "@/lib/services/projects";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const members = await listProjectMembers(user, params.id);
  return jsonOk(members);
});

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = addProjectMemberSchema.parse(await request.json());
  const member = await addProjectMember(user, params.id, input, getRequestIp(request));
  return jsonOk(member, { status: 201 });
});

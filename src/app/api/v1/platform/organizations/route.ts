import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { createOrganizationSchema, createOrganization, listOrganizations } from "@/lib/services/organizations";

export const runtime = "nodejs";

export const GET = withRouteErrorHandling(async () => {
  const { user } = await requireSession();
  const organizations = await listOrganizations(user);
  return jsonOk(organizations);
});

export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const { user } = await requireSession();
  const input = createOrganizationSchema.parse(await request.json());
  const org = await createOrganization(user, input, getRequestIp(request));
  return jsonOk(org, { status: 201 });
});

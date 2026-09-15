import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, jsonError, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { createClientSchema, createClient, listClients } from "@/lib/services/clients";

export const runtime = "nodejs";

export const GET = withRouteErrorHandling(async () => {
  const { user, organizationId } = await requireSession();
  if (!organizationId) return jsonError("NOT_APPLICABLE", "No organization context.", 400);
  const clients = await listClients(user, organizationId);
  return jsonOk(clients);
});

export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const { user, organizationId } = await requireSession();
  if (!organizationId) return jsonError("NOT_APPLICABLE", "No organization context.", 400);
  const input = createClientSchema.parse(await request.json());
  const client = await createClient(user, organizationId, input, getRequestIp(request));
  return jsonOk(client, { status: 201 });
});

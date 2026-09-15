import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { getClient, updateClient, updateClientSchema, archiveClient } from "@/lib/services/clients";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const client = await getClient(user, params.id);
  return jsonOk(client);
});

export const PATCH = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = updateClientSchema.parse(await request.json());
  const client = await updateClient(user, params.id, input, getRequestIp(request));
  return jsonOk(client);
});

export const DELETE = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const client = await archiveClient(user, params.id, getRequestIp(request));
  return jsonOk(client);
});

import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { listMessages, sendMessage, sendMessageSchema } from "@/lib/services/messages";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const messages = await listMessages(user, params.id);
  return jsonOk(messages);
});

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = sendMessageSchema.parse(await request.json());
  const message = await sendMessage(user, params.id, input, getRequestIp(request));
  return jsonOk(message, { status: 201 });
});

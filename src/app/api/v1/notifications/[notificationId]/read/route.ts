import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { markNotificationRead } from "@/lib/services/notifications";

export const runtime = "nodejs";

type RouteParams = { params: { notificationId: string } };

export const POST = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const notification = await markNotificationRead(user, params.notificationId);
  return jsonOk(notification);
});

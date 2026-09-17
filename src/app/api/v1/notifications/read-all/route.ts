import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { markAllNotificationsRead } from "@/lib/services/notifications";

export const runtime = "nodejs";

export const POST = withRouteErrorHandling(async (_request: NextRequest) => {
  const { user } = await requireSession();
  await markAllNotificationsRead(user);
  return jsonOk({ success: true });
});

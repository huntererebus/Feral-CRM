import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { listNotifications } from "@/lib/services/notifications";

export const runtime = "nodejs";

export const GET = withRouteErrorHandling(async (request: NextRequest) => {
  const { user } = await requireSession();
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const notifications = await listNotifications(user, { unreadOnly });
  return jsonOk(notifications);
});

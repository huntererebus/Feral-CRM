"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/services/notifications";

export async function markReadAction(notificationId: string) {
  const { user } = await requireSession();
  await markNotificationRead(user, notificationId);
  revalidatePath("/notifications");
}

export async function markAllReadAction() {
  const { user } = await requireSession();
  await markAllNotificationsRead(user);
  revalidatePath("/notifications");
}

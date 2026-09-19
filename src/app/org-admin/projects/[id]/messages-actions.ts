"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { sendMessage, sendMessageSchema } from "@/lib/services/messages";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function sendMessageAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requireSession();
    const projectId = String(formData.get("projectId"));
    const requestInternal = formData.get("visibility") === "internal";

    const input = sendMessageSchema.parse({
      body: formData.get("body"),
      visibility: requestInternal ? "internal" : undefined,
    });
    await sendMessage(user, projectId, input, null);
    revalidatePath(`/org-admin/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

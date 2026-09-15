"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { createClient, createClientSchema } from "@/lib/services/clients";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function createClientAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireSession();
    if (!organizationId) return { ok: false, message: "No organization context." };

    const input = createClientSchema.parse({
      name: formData.get("name"),
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      website: formData.get("website") || null,
    });
    await createClient(user, organizationId, input, null);
    revalidatePath("/org-admin/clients");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

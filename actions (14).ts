"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { createOrganization, createOrganizationSchema } from "@/lib/services/organizations";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function createOrganizationAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user } = await requireSession();
    const input = createOrganizationSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      adminEmail: formData.get("adminEmail"),
      adminName: formData.get("adminName"),
    });
    await createOrganization(user, input, null);
    revalidatePath("/platform-admin/organizations");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

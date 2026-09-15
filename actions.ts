"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { updateOrgSettings, updateOrgSettingsSchema } from "@/lib/services/organizations";

export type ActionResult = { status: "idle" } | { status: "success" } | { status: "error"; message: string };

export async function updateOrgSettingsAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireSession();
    if (!organizationId) return { status: "error", message: "No organization context." };

    const input = updateOrgSettingsSchema.parse({
      name: formData.get("name") || undefined,
      primaryColor: formData.get("primaryColor") || null,
      secondaryColor: formData.get("secondaryColor") || null,
      logoUrl: formData.get("logoUrl") || null,
      faviconUrl: formData.get("faviconUrl") || null,
    });
    await updateOrgSettings(user, organizationId, input, null);
    revalidatePath("/settings/organization");
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

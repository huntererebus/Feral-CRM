"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { createProject, createProjectSchema } from "@/lib/services/projects";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function createProjectAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user, organizationId } = await requireSession();
    if (!organizationId) return { ok: false, message: "No organization context." };

    const rawDueDate = formData.get("dueDate");

    const input = createProjectSchema.parse({
      clientId: user.role === "client" ? user.clientId : formData.get("clientId"),
      name: formData.get("name"),
      description: formData.get("description") || null,
      priority: formData.get("priority") || "normal",
      dueDate: rawDueDate ? rawDueDate : null,
    });
    await createProject(user, organizationId, input, null);
    revalidatePath("/org-admin/projects");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

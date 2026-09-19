"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { addComment, createCommentSchema, resolveComment } from "@/lib/services/comments";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function addCommentAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requireSession();
    const projectId = String(formData.get("projectId"));
    const versionId = String(formData.get("versionId"));
    const requestInternal = formData.get("visibility") === "internal";

    const input = createCommentSchema.parse({
      body: formData.get("body"),
      visibility: requestInternal ? "internal" : undefined,
    });
    await addComment(user, projectId, versionId, input, null);
    revalidatePath(`/org-admin/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function resolveCommentAction(projectId: string, versionId: string, commentId: string) {
  const { user } = await requireSession();
  await resolveComment(user, projectId, versionId, commentId, null);
  revalidatePath(`/org-admin/projects/${projectId}`);
}

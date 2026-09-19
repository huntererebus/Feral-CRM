"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { submitDraftReview, reviewDecisionSchema, approveFinalDelivery, resolveRevisionRequest } from "@/lib/services/reviews";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function submitDraftReviewAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requireSession();
    const projectId = String(formData.get("projectId"));
    const versionId = String(formData.get("versionId"));
    const input = reviewDecisionSchema.parse({
      decision: formData.get("decision"),
      comment: formData.get("comment") || null,
    });
    await submitDraftReview(user, projectId, versionId, input, null);
    revalidatePath(`/org-admin/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function approveFinalAction(projectId: string, versionId: string) {
  const { user } = await requireSession();
  await approveFinalDelivery(user, projectId, versionId, {}, null);
  revalidatePath(`/org-admin/projects/${projectId}`);
}

export async function resolveRevisionRequestAction(projectId: string, revisionRequestId: string, status: "in_progress" | "resolved") {
  const { user } = await requireSession();
  await resolveRevisionRequest(user, projectId, revisionRequestId, { status }, null);
  revalidatePath(`/org-admin/projects/${projectId}`);
}

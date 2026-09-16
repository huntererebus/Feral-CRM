"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  transitionProjectStatus,
  transitionProjectStatusSchema,
  assignEditor,
  assignEditorSchema,
  upsertProjectRequirements,
  upsertProjectRequirementsSchema,
  addProjectMember,
  addProjectMemberSchema,
  removeProjectMember,
} from "@/lib/services/projects";

export type ActionResult = { ok: true } | { ok: false; message: string };

function fail(err: unknown): ActionResult {
  return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
}

export async function transitionStatusAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user } = await requireSession();
    const projectId = String(formData.get("projectId"));
    const input = transitionProjectStatusSchema.parse({ toStatus: formData.get("toStatus") });
    await transitionProjectStatus(user, projectId, input, null);
    revalidatePath(`/org-admin/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function assignEditorAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user } = await requireSession();
    const projectId = String(formData.get("projectId"));
    const input = assignEditorSchema.parse({ editorId: formData.get("editorId") });
    await assignEditor(user, projectId, input, null);
    revalidatePath(`/org-admin/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateRequirementsAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user } = await requireSession();
    const projectId = String(formData.get("projectId"));
    const rawHashtags = String(formData.get("hashtags") ?? "");
    const rawDuration = formData.get("durationSeconds");

    const input = upsertProjectRequirementsSchema.parse({
      aspectRatio: formData.get("aspectRatio") || null,
      resolution: formData.get("resolution") || null,
      durationSeconds: rawDuration ? rawDuration : null,
      captionRequirements: formData.get("captionRequirements") || null,
      hashtags: rawHashtags
        ? rawHashtags.split(",").map((h) => h.trim()).filter(Boolean)
        : [],
      musicRequirements: formData.get("musicRequirements") || null,
      brandRequirements: formData.get("brandRequirements") || null,
    });
    await upsertProjectRequirements(user, projectId, input, null);
    revalidatePath(`/org-admin/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function addMemberAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user } = await requireSession();
    const projectId = String(formData.get("projectId"));
    const input = addProjectMemberSchema.parse({
      userId: formData.get("userId"),
      roleOnProject: formData.get("roleOnProject"),
    });
    await addProjectMember(user, projectId, input, null);
    revalidatePath(`/org-admin/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function removeMemberAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user } = await requireSession();
    const projectId = String(formData.get("projectId"));
    const userId = String(formData.get("userId"));
    await removeProjectMember(user, projectId, userId, null);
    revalidatePath(`/org-admin/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

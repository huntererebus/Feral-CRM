"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateRequirementsAction, type ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

type Requirements = {
  aspectRatio: string | null;
  resolution: string | null;
  durationSeconds: number | null;
  captionRequirements: string | null;
  hashtags: string[];
  musicRequirements: string | null;
  brandRequirements: string | null;
  targetPostingDate: Date | null;
} | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save requirements"}
    </button>
  );
}

export function RequirementsForm({ projectId, requirements }: { projectId: string; requirements: Requirements }) {
  const [state, formAction] = useFormState(updateRequirementsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-neutral-800 p-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="aspectRatio"
          placeholder="Aspect ratio (e.g. 9:16)"
          defaultValue={requirements?.aspectRatio ?? ""}
          className="rounded bg-neutral-900 px-3 py-2 text-sm"
        />
        <input
          name="resolution"
          placeholder="Resolution (e.g. 1080x1920)"
          defaultValue={requirements?.resolution ?? ""}
          className="rounded bg-neutral-900 px-3 py-2 text-sm"
        />
        <input
          name="durationSeconds"
          type="number"
          min="1"
          placeholder="Target duration (seconds)"
          defaultValue={requirements?.durationSeconds ?? ""}
          className="rounded bg-neutral-900 px-3 py-2 text-sm"
        />
        <input
          name="hashtags"
          placeholder="Hashtags, comma separated"
          defaultValue={requirements?.hashtags?.join(", ") ?? ""}
          className="rounded bg-neutral-900 px-3 py-2 text-sm"
        />
      </div>
      <textarea
        name="captionRequirements"
        placeholder="Caption requirements"
        defaultValue={requirements?.captionRequirements ?? ""}
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      <textarea
        name="musicRequirements"
        placeholder="Music requirements"
        defaultValue={requirements?.musicRequirements ?? ""}
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      <textarea
        name="brandRequirements"
        placeholder="Brand requirements"
        defaultValue={requirements?.brandRequirements ?? ""}
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
      <SubmitButton />
    </form>
  );
}

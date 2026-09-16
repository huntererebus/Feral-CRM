"use client";

import { useFormState, useFormStatus } from "react-dom";
import { assignEditorAction, type ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Assigning…" : "Assign"}
    </button>
  );
}

// Deliberately a plain user-id field rather than a populated dropdown — a
// proper org-member picker belongs to the dashboard work in a later stage
// (see SETUP.md); this keeps Stage 3 scoped to the project/status/member
// model itself, same restraint Stage 2's client form used.
export function AssignEditorForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useFormState(assignEditorAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input
        name="editorId"
        placeholder="Editor user ID"
        required
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      <SubmitButton />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
    </form>
  );
}

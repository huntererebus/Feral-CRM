"use client";

import { useFormState, useFormStatus } from "react-dom";
import { transitionStatusAction, type ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Updating…" : "Move status"}
    </button>
  );
}

export function StatusForm({ projectId, nextStatuses }: { projectId: string; nextStatuses: string[] }) {
  const [state, formAction] = useFormState(transitionStatusAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <select name="toStatus" required className="rounded bg-neutral-900 px-3 py-2 text-sm">
        {nextStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <SubmitButton />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
    </form>
  );
}

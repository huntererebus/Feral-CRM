"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createProjectAction, type ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add project"}
    </button>
  );
}

export function CreateProjectForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(createProjectAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-neutral-800 p-4">
      <h2 className="text-sm font-medium text-neutral-300">New project</h2>
      <input
        name="name"
        placeholder="Project name"
        required
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      {clients.length > 0 && (
        <select name="clientId" required className="rounded bg-neutral-900 px-3 py-2 text-sm">
          <option value="">Select a client…</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      )}
      <textarea
        name="description"
        placeholder="Description (optional)"
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      <select name="priority" defaultValue="normal" className="rounded bg-neutral-900 px-3 py-2 text-sm">
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
      <input name="dueDate" type="date" className="rounded bg-neutral-900 px-3 py-2 text-sm" />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
      <SubmitButton />
    </form>
  );
}

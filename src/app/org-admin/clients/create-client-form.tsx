"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createClientAction, type ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add client"}
    </button>
  );
}

export function CreateClientForm() {
  const [state, formAction] = useFormState(createClientAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-neutral-800 p-4">
      <h2 className="text-sm font-medium text-neutral-300">New client</h2>
      <input
        name="name"
        placeholder="Client / company name"
        required
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      <input name="email" type="email" placeholder="Primary email (optional)" className="rounded bg-neutral-900 px-3 py-2 text-sm" />
      <input name="phone" placeholder="Phone (optional)" className="rounded bg-neutral-900 px-3 py-2 text-sm" />
      <input name="website" type="url" placeholder="Website (optional)" className="rounded bg-neutral-900 px-3 py-2 text-sm" />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
      <SubmitButton />
    </form>
  );
}

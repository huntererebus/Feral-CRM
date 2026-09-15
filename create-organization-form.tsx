"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createOrganizationAction, type ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create organization"}
    </button>
  );
}

export function CreateOrganizationForm() {
  const [state, formAction] = useFormState(createOrganizationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-neutral-800 p-4">
      <h2 className="text-sm font-medium text-neutral-300">New agency</h2>
      <input
        name="name"
        placeholder="Agency name"
        required
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      <input
        name="slug"
        placeholder="subdomain-slug"
        required
        pattern="[a-z0-9-]+"
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      <input
        name="adminName"
        placeholder="First admin's name"
        required
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      <input
        name="adminEmail"
        type="email"
        placeholder="First admin's email"
        required
        className="rounded bg-neutral-900 px-3 py-2 text-sm"
      />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
      <SubmitButton />
    </form>
  );
}

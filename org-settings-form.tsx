"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Organization } from "@prisma/client";
import { updateOrgSettingsAction, type ActionResult } from "./actions";

const initialState: ActionResult = { status: "idle" };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save branding"}
    </button>
  );
}

export function OrgSettingsForm({ org }: { org: Organization }) {
  const [state, formAction] = useFormState(updateOrgSettingsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-neutral-800 p-4">
      <label className="text-xs text-neutral-500">
        Organization name
        <input name="name" defaultValue={org.name} className="mt-1 w-full rounded bg-neutral-900 px-3 py-2 text-sm" />
      </label>
      <label className="text-xs text-neutral-500">
        Logo URL
        <input name="logoUrl" defaultValue={org.logoUrl ?? ""} className="mt-1 w-full rounded bg-neutral-900 px-3 py-2 text-sm" />
      </label>
      <label className="text-xs text-neutral-500">
        Favicon URL
        <input name="faviconUrl" defaultValue={org.faviconUrl ?? ""} className="mt-1 w-full rounded bg-neutral-900 px-3 py-2 text-sm" />
      </label>
      <div className="flex gap-4">
        <label className="flex-1 text-xs text-neutral-500">
          Primary color
          <input
            name="primaryColor"
            type="color"
            defaultValue={org.primaryColor ?? "#4f46e5"}
            className="mt-1 h-9 w-full rounded bg-neutral-900"
          />
        </label>
        <label className="flex-1 text-xs text-neutral-500">
          Secondary color
          <input
            name="secondaryColor"
            type="color"
            defaultValue={org.secondaryColor ?? "#14b8a6"}
            className="mt-1 h-9 w-full rounded bg-neutral-900"
          />
        </label>
      </div>
      {state.status === "error" && <p className="text-sm text-red-400">{state.message}</p>}
      {state.status === "success" && <p className="text-sm text-emerald-400">Saved.</p>}
      <SaveButton />
    </form>
  );
}

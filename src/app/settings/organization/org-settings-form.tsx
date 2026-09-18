"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Organization } from "@prisma/client";
import { updateOrgSettingsAction, type ActionResult } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { status: "idle" };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save branding"}
    </Button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

export function OrgSettingsForm({ org }: { org: Organization }) {
  const [state, formAction] = useFormState(updateOrgSettingsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label="Organization name">
        <Input name="name" defaultValue={org.name} />
      </Field>
      <Field label="Logo URL">
        <Input name="logoUrl" defaultValue={org.logoUrl ?? ""} />
      </Field>
      <Field label="Favicon URL">
        <Input name="faviconUrl" defaultValue={org.faviconUrl ?? ""} />
      </Field>
      <div className="flex gap-4">
        <Field label="Primary color">
          <input
            name="primaryColor"
            type="color"
            defaultValue={org.primaryColor ?? "#4f46e5"}
            className="h-9 w-full rounded border border-neutral-800 bg-neutral-900"
          />
        </Field>
        <Field label="Secondary color">
          <input
            name="secondaryColor"
            type="color"
            defaultValue={org.secondaryColor ?? "#14b8a6"}
            className="h-9 w-full rounded border border-neutral-800 bg-neutral-900"
          />
        </Field>
      </div>
      {state.status === "error" && <p className="text-sm text-red-400">{state.message}</p>}
      {state.status === "success" && <p className="text-sm text-emerald-400">Saved.</p>}
      <div>
        <SaveButton />
      </div>
    </form>
  );
}

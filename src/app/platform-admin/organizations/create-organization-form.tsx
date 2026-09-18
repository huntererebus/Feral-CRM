"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createOrganizationAction, type ActionResult } from "./actions";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create organization"}
    </Button>
  );
}

export function CreateOrganizationForm() {
  const [state, formAction] = useFormState(createOrganizationAction, initialState);

  return (
    <Panel>
      <PanelHeader>
        <h2 className="text-sm font-medium text-neutral-300">New agency</h2>
      </PanelHeader>
      <PanelBody>
        <form action={formAction} className="flex flex-col gap-3">
          <Input name="name" placeholder="Agency name" required />
          <Input name="slug" placeholder="subdomain-slug" required pattern="[a-z0-9-]+" className="font-mono" />
          <Input name="adminName" placeholder="First admin's name" required />
          <Input name="adminEmail" type="email" placeholder="First admin's email" required />
          {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
          <div>
            <SubmitButton />
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}

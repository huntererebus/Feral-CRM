"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createClientAction, type ActionResult } from "./actions";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add client"}
    </Button>
  );
}

export function CreateClientForm() {
  const [state, formAction] = useFormState(createClientAction, initialState);

  return (
    <Panel>
      <PanelHeader>
        <h2 className="text-sm font-medium text-neutral-300">New client</h2>
      </PanelHeader>
      <PanelBody>
        <form action={formAction} className="flex flex-col gap-3">
          <Input name="name" placeholder="Client / company name" required />
          <Input name="email" type="email" placeholder="Primary email (optional)" />
          <Input name="phone" placeholder="Phone (optional)" />
          <Input name="website" type="url" placeholder="Website (optional)" />
          {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
          <div>
            <SubmitButton />
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}

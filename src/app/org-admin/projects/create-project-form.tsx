"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createProjectAction, type ActionResult } from "./actions";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add project"}
    </Button>
  );
}

export function CreateProjectForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(createProjectAction, initialState);

  return (
    <Panel>
      <PanelHeader>
        <h2 className="text-sm font-medium text-neutral-300">New project</h2>
      </PanelHeader>
      <PanelBody>
        <form action={formAction} className="flex flex-col gap-3">
          <Input name="name" placeholder="Project name" required />
          {clients.length > 0 && (
            <Select name="clientId" required defaultValue="">
              <option value="" disabled>
                Select a client…
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          )}
          <Textarea name="description" placeholder="Description (optional)" />
          <Select name="priority" defaultValue="normal">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
          <Input name="dueDate" type="date" />
          {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
          <div>
            <SubmitButton />
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}

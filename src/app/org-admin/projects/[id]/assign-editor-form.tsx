"use client";

import { useFormState, useFormStatus } from "react-dom";
import { assignEditorAction, type ActionResult } from "./actions";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Assigning…" : "Assign"}
    </Button>
  );
}

export function AssignEditorForm({
  projectId,
  editors,
}: {
  projectId: string;
  editors: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(assignEditorAction, initialState);

  if (editors.length === 0) {
    return <EmptyState title="No editors yet" description="Invite an editor from Settings to assign them here." />;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <Select name="editorId" required defaultValue="">
        <option value="" disabled>
          Select an editor…
        </option>
        {editors.map((editor) => (
          <option key={editor.id} value={editor.id}>
            {editor.name}
          </option>
        ))}
      </Select>
      <SubmitButton />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
    </form>
  );
}

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendMessageAction, type ActionResult } from "./messages-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending…" : "Send"}
    </Button>
  );
}

export function SendMessageForm({ projectId, canPostInternal }: { projectId: string; canPostInternal: boolean }) {
  const [state, formAction] = useFormState(sendMessageAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex items-center gap-2">
        <Input name="body" placeholder="Message the team…" required className="flex-1" />
        <SubmitButton />
      </div>
      {canPostInternal && (
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          <input type="checkbox" name="visibility" value="internal" className="accent-brand-primary" />
          Internal note (not visible to the client)
        </label>
      )}
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
    </form>
  );
}

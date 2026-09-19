"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addCommentAction, type ActionResult } from "./comments-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Posting…" : "Comment"}
    </Button>
  );
}

export function AddCommentForm({
  projectId,
  versionId,
  canPostInternal,
}: {
  projectId: string;
  versionId: string;
  canPostInternal: boolean;
}) {
  const [state, formAction] = useFormState(addCommentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="versionId" value={versionId} />
      <div className="flex items-center gap-2">
        <Input name="body" placeholder="Leave a note…" required className="flex-1" />
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

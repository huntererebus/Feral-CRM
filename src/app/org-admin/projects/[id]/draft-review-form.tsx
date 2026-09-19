"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitDraftReviewAction, type ActionResult } from "./review-actions";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: true };

function SubmitButton({ decision, label }: { decision: "approved" | "revision_requested"; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      variant={decision === "approved" ? "primary" : "secondary"}
      disabled={pending}
    >
      {label}
    </Button>
  );
}

export function DraftReviewForm({ projectId, versionId }: { projectId: string; versionId: string }) {
  const [state, formAction] = useFormState(submitDraftReviewAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="versionId" value={versionId} />
      <Textarea name="comment" placeholder="Notes for the team (required if requesting changes)" />
      <div className="flex gap-2">
        <SubmitButton decision="approved" label="Approve draft" />
        <SubmitButton decision="revision_requested" label="Request revision" />
      </div>
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
    </form>
  );
}

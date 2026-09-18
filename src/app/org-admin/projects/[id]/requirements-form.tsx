"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateRequirementsAction, type ActionResult } from "./actions";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: true };

type Requirements = {
  aspectRatio: string | null;
  resolution: string | null;
  durationSeconds: number | null;
  captionRequirements: string | null;
  hashtags: string[];
  musicRequirements: string | null;
  brandRequirements: string | null;
  targetPostingDate: Date | null;
} | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save requirements"}
    </Button>
  );
}

export function RequirementsForm({ projectId, requirements }: { projectId: string; requirements: Requirements }) {
  const [state, formAction] = useFormState(updateRequirementsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid grid-cols-2 gap-3">
        <Input name="aspectRatio" placeholder="Aspect ratio (e.g. 9:16)" defaultValue={requirements?.aspectRatio ?? ""} className="font-mono" />
        <Input name="resolution" placeholder="Resolution (e.g. 1080x1920)" defaultValue={requirements?.resolution ?? ""} className="font-mono" />
        <Input
          name="durationSeconds"
          type="number"
          min="1"
          placeholder="Target duration (seconds)"
          defaultValue={requirements?.durationSeconds ?? ""}
          className="font-mono"
        />
        <Input name="hashtags" placeholder="Hashtags, comma separated" defaultValue={requirements?.hashtags?.join(", ") ?? ""} />
      </div>
      <Textarea name="captionRequirements" placeholder="Caption requirements" defaultValue={requirements?.captionRequirements ?? ""} />
      <Textarea name="musicRequirements" placeholder="Music requirements" defaultValue={requirements?.musicRequirements ?? ""} />
      <Textarea name="brandRequirements" placeholder="Brand requirements" defaultValue={requirements?.brandRequirements ?? ""} />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

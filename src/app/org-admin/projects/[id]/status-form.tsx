"use client";

import { useFormState, useFormStatus } from "react-dom";
import { transitionStatusAction, type ActionResult } from "./actions";
import { statusDisplay } from "@/lib/design/status-zones";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ProjectStatus } from "@prisma/client";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Updating…" : "Move status"}
    </Button>
  );
}

export function StatusForm({ projectId, nextStatuses }: { projectId: string; nextStatuses: ProjectStatus[] }) {
  const [state, formAction] = useFormState(transitionStatusAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <Select name="toStatus" required className="w-auto">
        {nextStatuses.map((status) => (
          <option key={status} value={status}>
            {statusDisplay(status).label}
          </option>
        ))}
      </Select>
      <SubmitButton />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
    </form>
  );
}

"use client";

import { useFormStatus } from "react-dom";
import { approveFinalAction } from "./review-actions";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Approving…" : "Approve final delivery"}
    </Button>
  );
}

export function ApproveFinalButton({ projectId, versionId }: { projectId: string; versionId: string }) {
  return (
    <form action={approveFinalAction.bind(null, projectId, versionId)}>
      <SubmitButton />
    </form>
  );
}

"use client";

import { useFormStatus } from "react-dom";
import { resolveRevisionRequestAction } from "./review-actions";

function StatusButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-brand-primary hover:underline disabled:opacity-50">
      {pending ? "Updating…" : label}
    </button>
  );
}

export function RevisionRequestStatusButton({
  projectId,
  revisionRequestId,
  toStatus,
  label,
}: {
  projectId: string;
  revisionRequestId: string;
  toStatus: "in_progress" | "resolved";
  label: string;
}) {
  return (
    <form action={resolveRevisionRequestAction.bind(null, projectId, revisionRequestId, toStatus)}>
      <StatusButton label={label} />
    </form>
  );
}

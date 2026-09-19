"use client";

import { useFormStatus } from "react-dom";
import { resolveCommentAction } from "./comments-actions";

function ResolveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-neutral-500 hover:text-neutral-200 disabled:opacity-50">
      {pending ? "Resolving…" : "Resolve"}
    </button>
  );
}

export function ResolveCommentButton({ projectId, versionId, commentId }: { projectId: string; versionId: string; commentId: string }) {
  return (
    <form action={resolveCommentAction.bind(null, projectId, versionId, commentId)}>
      <ResolveButton />
    </form>
  );
}

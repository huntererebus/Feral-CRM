"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addMemberAction, removeMemberAction, type ActionResult } from "./actions";

const initialState: ActionResult = { ok: true };

function AddSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add member"}
    </button>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-red-400 hover:underline disabled:opacity-50">
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

function AddMemberForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useFormState(addMemberAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input name="userId" placeholder="User ID" required className="rounded bg-neutral-900 px-3 py-2 text-sm" />
      <select name="roleOnProject" required className="rounded bg-neutral-900 px-3 py-2 text-sm">
        <option value="account_manager">Account manager</option>
        <option value="editor">Editor</option>
        <option value="observer">Observer</option>
      </select>
      <AddSubmitButton />
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
    </form>
  );
}

function RemoveMemberForm({ projectId, userId }: { projectId: string; userId: string }) {
  const [, formAction] = useFormState(removeMemberAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="userId" value={userId} />
      <RemoveButton />
    </form>
  );
}

export function MembersPanel({
  projectId,
  members,
  canManage,
}: {
  projectId: string;
  members: { userId: string; name: string; roleOnProject: string }[];
  canManage: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {members.length === 0 ? (
        <p className="text-sm text-neutral-500">No members added beyond the account manager/editor above.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between border-t border-neutral-800 py-2">
              <span>
                {m.name} — {m.roleOnProject}
              </span>
              {canManage && <RemoveMemberForm projectId={projectId} userId={m.userId} />}
            </li>
          ))}
        </ul>
      )}
      {canManage && <AddMemberForm projectId={projectId} />}
    </div>
  );
}

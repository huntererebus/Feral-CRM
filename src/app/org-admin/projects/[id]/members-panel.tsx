"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addMemberAction, removeMemberAction, type ActionResult } from "./actions";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

const initialState: ActionResult = { ok: true };

function AddSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Adding…" : "Add"}
    </Button>
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

function AddMemberForm({
  projectId,
  directory,
}: {
  projectId: string;
  directory: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(addMemberAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 border-t border-neutral-900 pt-3">
      <input type="hidden" name="projectId" value={projectId} />
      <Select name="userId" required defaultValue="">
        <option value="" disabled>
          Select a member…
        </option>
        {directory.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </Select>
      <div className="flex items-center gap-2">
        <Select name="roleOnProject" required defaultValue="observer" className="flex-1">
          <option value="account_manager">Account manager</option>
          <option value="editor">Editor</option>
          <option value="observer">Observer</option>
        </Select>
        <AddSubmitButton />
      </div>
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
  directory,
}: {
  projectId: string;
  members: { userId: string; name: string; roleOnProject: string }[];
  canManage: boolean;
  directory: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {members.length === 0 ? (
        <p className="text-sm text-neutral-500">No additional members.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={m.name} size="sm" />
                <div className="text-sm">
                  <p className="text-neutral-200">{m.name}</p>
                  <p className="font-mono text-xs text-neutral-500">{m.roleOnProject}</p>
                </div>
              </div>
              {canManage && <RemoveMemberForm projectId={projectId} userId={m.userId} />}
            </li>
          ))}
        </ul>
      )}
      {canManage && <AddMemberForm projectId={projectId} directory={directory} />}
    </div>
  );
}

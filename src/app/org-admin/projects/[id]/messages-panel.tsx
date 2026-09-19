import { listMessages } from "@/lib/services/messages";
import { canPostInternalNote, type SessionUser, type ProjectScope } from "@/lib/rbac";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Avatar } from "@/components/ui/avatar";
import { SendMessageForm } from "./send-message-form";

export async function MessagesPanel({
  projectId,
  user,
  scope,
}: {
  projectId: string;
  user: SessionUser;
  scope: ProjectScope;
}) {
  const messages = await listMessages(user, projectId);
  const canPostInternal = canPostInternalNote(user, scope);

  return (
    <Panel>
      <PanelHeader>
        <h2 className="text-sm font-medium text-neutral-300">Messages</h2>
      </PanelHeader>
      <PanelBody className="flex flex-col gap-4">
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-500">No messages yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className="flex items-start gap-2">
                <Avatar name={m.sender.name} size="sm" />
                <div>
                  <p className="text-sm text-neutral-200">
                    {m.body}
                    {m.visibility === "internal" && (
                      <span className="ml-1.5 rounded bg-amber-950 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                        internal
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-[11px] text-neutral-600">{m.sender.name}</p>
                  {m.attachments.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {m.attachments.map((a) => (
                        <li key={a.id} className="font-mono text-[11px] text-neutral-500">
                          📎 {a.mediaVersion.filename}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <SendMessageForm projectId={projectId} canPostInternal={canPostInternal} />
      </PanelBody>
    </Panel>
  );
}

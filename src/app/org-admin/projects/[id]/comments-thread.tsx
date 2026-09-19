import { requireSession } from "@/lib/session";
import { listComments } from "@/lib/services/comments";
import { canPostInternalNote, canResolveMediaComment, type ProjectScope } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Avatar } from "@/components/ui/avatar";
import { AddCommentForm } from "./add-comment-form";
import { ResolveCommentButton } from "./resolve-comment-button";

export async function CommentsThread({ projectId, versionId }: { projectId: string; versionId: string }) {
  const { user } = await requireSession();
  const comments = await listComments(user, projectId, versionId);

  // Small, self-contained lookup rather than threading ProjectScope all the
  // way down from the page — this component only needs it for the two
  // permission checks below, and it's already fetching from the DB anyway.
  const project = await db.project.findFirst({
    where: { id: projectId },
    include: { members: { select: { userId: true } } },
  });
  const scope: ProjectScope | null = project
    ? {
        organizationId: project.organizationId,
        clientId: project.clientId,
        accountManagerId: project.accountManagerId,
        editorId: project.editorId,
        memberUserIds: project.members.map((m) => m.userId),
      }
    : null;

  const canPostInternal = scope ? canPostInternalNote(user, scope) : false;
  const canResolve = scope ? canResolveMediaComment(user, scope) : false;

  return (
    <div className="flex flex-col gap-2 rounded bg-neutral-950/60 p-3">
      {comments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Avatar name={c.author.name} size="sm" />
                <div>
                  <p className="text-sm text-neutral-200">
                    {c.body}
                    {c.visibility === "internal" && (
                      <span className="ml-1.5 rounded bg-amber-950 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                        internal
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-[11px] text-neutral-600">{c.author.name}</p>
                </div>
              </div>
              {canResolve && !c.resolvedAt && (
                <ResolveCommentButton projectId={projectId} versionId={versionId} commentId={c.id} />
              )}
            </li>
          ))}
        </ul>
      )}
      <AddCommentForm projectId={projectId} versionId={versionId} canPostInternal={canPostInternal} />
    </div>
  );
}

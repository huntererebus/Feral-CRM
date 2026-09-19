import { db } from "@/lib/db";
import { listRevisionRequests } from "@/lib/services/reviews";
import { canApproveOrRequestRevision, canManageRevisionRequest, type SessionUser, type ProjectScope } from "@/lib/rbac";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { DraftReviewForm } from "./draft-review-form";
import { ApproveFinalButton } from "./approve-final-button";
import { RevisionRequestStatusButton } from "./revision-request-status-button";
import type { ProjectStatus } from "@prisma/client";

export async function ReviewPanel({
  projectId,
  status,
  user,
  scope,
}: {
  projectId: string;
  status: ProjectStatus;
  user: SessionUser;
  scope: ProjectScope;
}) {
  const isClient = canApproveOrRequestRevision(user, scope);
  const isStaff = canManageRevisionRequest(user, scope);

  if (isClient && (status === "CLIENT_REVIEW" || status === "FINAL_REVIEW")) {
    const kind = status === "CLIENT_REVIEW" ? "draft" : "final";
    const asset = await db.mediaAsset.findFirst({
      where: { projectId, kind, archivedAt: null },
      include: { currentVersion: true },
      orderBy: { createdAt: "desc" },
    });

    if (!asset?.currentVersion) {
      return (
        <Panel>
          <PanelHeader>
            <h2 className="text-sm font-medium text-neutral-300">Review</h2>
          </PanelHeader>
          <PanelBody>
            <p className="text-sm text-neutral-500">
              Waiting on the team to upload the {kind === "draft" ? "draft" : "final delivery"}.
            </p>
          </PanelBody>
        </Panel>
      );
    }

    return (
      <Panel>
        <PanelHeader>
          <h2 className="text-sm font-medium text-neutral-300">
            {kind === "draft" ? "Review the draft" : "Approve final delivery"}
          </h2>
        </PanelHeader>
        <PanelBody>
          {kind === "draft" ? (
            <DraftReviewForm projectId={projectId} versionId={asset.currentVersion.id} />
          ) : (
            <ApproveFinalButton projectId={projectId} versionId={asset.currentVersion.id} />
          )}
        </PanelBody>
      </Panel>
    );
  }

  if (isStaff) {
    const revisionRequests = await listRevisionRequests(user, projectId);
    const open = revisionRequests.filter((r) => r.status !== "resolved");
    if (open.length === 0) return null;

    return (
      <Panel>
        <PanelHeader>
          <h2 className="text-sm font-medium text-neutral-300">Open revision requests</h2>
        </PanelHeader>
        <PanelBody>
          <ul className="flex flex-col gap-3">
            {open.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 border-t border-neutral-900 pt-3 first:border-t-0 first:pt-0">
                <div>
                  <p className="text-sm text-neutral-200">{r.comment}</p>
                  <p className="font-mono text-xs text-neutral-500">
                    {r.requestedBy.name} · {r.status}
                  </p>
                </div>
                {r.status === "open" ? (
                  <RevisionRequestStatusButton projectId={projectId} revisionRequestId={r.id} toStatus="in_progress" label="Start" />
                ) : (
                  <RevisionRequestStatusButton projectId={projectId} revisionRequestId={r.id} toStatus="resolved" label="Mark resolved" />
                )}
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>
    );
  }

  return null;
}

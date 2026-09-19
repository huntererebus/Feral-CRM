import { listProjectMedia } from "@/lib/services/media";
import { canUploadSourceMedia, canUploadDraftOrFinalMedia, type SessionUser, type ProjectScope } from "@/lib/rbac";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaUploadWidget } from "./media-upload-widget";
import { DownloadLink } from "./download-link";
import { CommentsThread } from "./comments-thread";

const KIND_LABEL: Record<"source" | "draft" | "final", string> = {
  source: "Source footage",
  draft: "Drafts",
  final: "Final deliverables",
};

// bigint can't cross the server/client component boundary as a prop, and
// isn't renderable directly in JSX either — format it to a string at the
// point of use, same reasoning as jsonOk's fix on the API side (this is
// the server-component equivalent of that same underlying constraint).
function formatBytes(bytes: bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let value = n / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export async function MediaSection({
  projectId,
  user,
  scope,
}: {
  projectId: string;
  user: SessionUser;
  scope: ProjectScope;
}) {
  const media = await listProjectMedia(user, projectId);

  const grouped: Record<"source" | "draft" | "final", typeof media> = { source: [], draft: [], final: [] };
  for (const asset of media) grouped[asset.kind as "source" | "draft" | "final"].push(asset);

  const uploadPermission: Record<"source" | "draft" | "final", boolean> = {
    source: canUploadSourceMedia(user, scope),
    draft: canUploadDraftOrFinalMedia(user, scope),
    final: canUploadDraftOrFinalMedia(user, scope),
  };

  return (
    <div className="flex flex-col gap-4">
      {(["source", "draft", "final"] as const).map((kind) => (
        <Panel key={kind}>
          <PanelHeader>
            <h2 className="text-sm font-medium text-neutral-300">{KIND_LABEL[kind]}</h2>
          </PanelHeader>
          <PanelBody className="flex flex-col gap-4">
            {grouped[kind].length === 0 ? (
              <p className="text-sm text-neutral-500">Nothing uploaded yet.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {grouped[kind].map((asset) => {
                  const current = asset.currentVersion;
                  return (
                    <li key={asset.id} className="flex flex-col gap-2 border-t border-neutral-900 pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between">
                        <div>
                          {current ? (
                            <>
                              <p className="text-sm text-neutral-200">{current.filename}</p>
                              <p className="font-mono text-xs text-neutral-500">
                                {formatBytes(current.fileSizeBytes)} · v{current.versionNumber} ·{" "}
                                <span
                                  className={
                                    current.status === "ready"
                                      ? "text-emerald-500"
                                      : current.status === "failed"
                                        ? "text-red-500"
                                        : "text-amber-500"
                                  }
                                >
                                  {current.status}
                                </span>
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-neutral-500">No ready version yet.</p>
                          )}
                        </div>
                        {current && current.status === "ready" && (
                          <DownloadLink projectId={projectId} versionId={current.id} filename={current.filename} />
                        )}
                      </div>

                      {uploadPermission[kind] && (
                        <MediaUploadWidget projectId={projectId} kind={kind} assetId={asset.id} />
                      )}

                      {current && current.status === "ready" && (
                        <CommentsThread projectId={projectId} versionId={current.id} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {uploadPermission[kind] && grouped[kind].length === 0 && (
              <MediaUploadWidget projectId={projectId} kind={kind} />
            )}
            {uploadPermission[kind] && grouped[kind].length > 0 && (
              <div className="border-t border-neutral-900 pt-3">
                <p className="mb-1.5 text-xs text-neutral-500">Upload a new {kind === "source" ? "clip" : "cut"}</p>
                <MediaUploadWidget projectId={projectId} kind={kind} />
              </div>
            )}
            {!uploadPermission[kind] && grouped[kind].length === 0 && (
              <EmptyState title={`No ${KIND_LABEL[kind].toLowerCase()}`} />
            )}
          </PanelBody>
        </Panel>
      ))}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type UploadState = { status: "idle" } | { status: "uploading" } | { status: "error"; message: string };

/**
 * Deliberately plain: pick a file, click upload, see a status line. No
 * progress bar, no chunking, no drag-and-drop — those are real UX
 * decisions that belong with a dedicated design pass, not a first cut.
 * What matters here is the three-step contract working correctly: our API
 * issues a presigned URL, the browser PUTs the file straight to R2 (not
 * through our server), then our API is told the upload finished.
 */
export function MediaUploadWidget({
  projectId,
  kind,
  assetId,
}: {
  projectId: string;
  kind: "source" | "draft" | "final";
  assetId?: string;
}) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setState({ status: "uploading" });

    let versionId: string | undefined;
    try {
      const initiateRes = await fetch(`/api/v1/projects/${projectId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          assetId: assetId ?? null,
          filename: file.name,
          fileType: file.type || "application/octet-stream",
          fileSizeBytes: file.size,
        }),
      });
      if (!initiateRes.ok) {
        const body = await initiateRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Could not start the upload.");
      }
      const { data } = await initiateRes.json();
      versionId = data.versionId;

      const putRes = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error("The file failed to upload to storage.");

      await fetch(`/api/v1/projects/${projectId}/media/${versionId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });

      setState({ status: "idle" });
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      // Best-effort — tell our API the version is dead so it doesn't sit
      // stuck at "uploading" forever. Fire-and-forget: the user already
      // has the real error message regardless of whether this succeeds.
      if (versionId) {
        fetch(`/api/v1/projects/${projectId}/media/${versionId}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "failed" }),
        }).catch(() => {});
      }
      setState({ status: "error", message: err instanceof Error ? err.message : "Upload failed." });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="flex-1 text-xs text-neutral-400 file:mr-2 file:rounded file:border-0 file:bg-neutral-800 file:px-2.5 file:py-1.5 file:text-xs file:text-neutral-200"
        />
        <Button type="button" size="sm" disabled={state.status === "uploading"} onClick={handleUpload}>
          {state.status === "uploading" ? "Uploading…" : "Upload"}
        </Button>
      </div>
      {state.status === "error" && <p className="text-sm text-red-400">{state.message}</p>}
    </div>
  );
}

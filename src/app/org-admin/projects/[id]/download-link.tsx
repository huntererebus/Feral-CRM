"use client";

import { useState } from "react";

export function DownloadLink({ projectId, versionId, filename }: { projectId: string; versionId: string; filename: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/media/${versionId}/download-url`);
      if (!res.ok) return;
      const { data } = await res.json();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-xs text-brand-primary hover:underline disabled:opacity-50"
    >
      {loading ? "Preparing…" : `Download ${filename}`}
    </button>
  );
}

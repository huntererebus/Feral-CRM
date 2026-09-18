import { statusDisplay } from "@/lib/design/status-zones";
import type { ProjectStatus } from "@prisma/client";

const ZONE_DOT_CLASSES: Record<string, string> = {
  production: "bg-zone-production",
  "client-review": "bg-zone-client-review",
  revision: "bg-zone-revision",
  complete: "bg-zone-complete",
  archived: "bg-zone-archived",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { zone, label } = statusDisplay(status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-200">
      <span className={`h-1.5 w-1.5 rounded-full ${ZONE_DOT_CLASSES[zone]}`} />
      {label}
    </span>
  );
}

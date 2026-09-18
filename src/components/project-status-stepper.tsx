import { STATUS_STEPPER_ORDER, statusDisplay } from "@/lib/design/status-zones";
import type { ProjectStatus } from "@prisma/client";

const ZONE_BG: Record<string, string> = {
  production: "bg-zone-production",
  "client-review": "bg-zone-client-review",
  revision: "bg-zone-revision",
  complete: "bg-zone-complete",
  archived: "bg-zone-archived",
};

/**
 * Renders the "happy path" as a horizontal stepper. A project that's taken
 * a detour (REVISION_REQUESTED, REVISION_IN_PROGRESS, ARCHIVED — not on
 * STATUS_STEPPER_ORDER) isn't forced into that linear row; it's shown as
 * its own callout instead, since bending the stepper to fit every kickback
 * would make the common case harder to read for the sake of the edge case.
 */
export function ProjectStatusStepper({ status }: { status: ProjectStatus }) {
  const isDetour = !STATUS_STEPPER_ORDER.includes(status);

  if (isDetour) {
    const { zone, label } = statusDisplay(status);
    return (
      <div className="flex items-center gap-2 rounded border border-neutral-800 px-3 py-2">
        <span className={`h-2 w-2 rounded-full ${ZONE_BG[zone]}`} />
        <span className="text-sm font-medium text-neutral-200">{label}</span>
      </div>
    );
  }

  const currentIndex = STATUS_STEPPER_ORDER.indexOf(status);

  return (
    <ol className="flex items-center">
      {STATUS_STEPPER_ORDER.map((step, index) => {
        const { zone, label } = statusDisplay(step);
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${reached ? ZONE_BG[zone] : "bg-neutral-800"} ${
                  isCurrent ? "ring-2 ring-offset-2 ring-offset-neutral-950 ring-neutral-600" : ""
                }`}
                aria-current={isCurrent ? "step" : undefined}
              />
              <span className={`text-[11px] font-mono ${isCurrent ? "text-neutral-200" : "text-neutral-600"}`}>
                {label}
              </span>
            </div>
            {index < STATUS_STEPPER_ORDER.length - 1 && (
              <div className={`mx-1 h-px flex-1 ${index < currentIndex ? ZONE_BG[zone] : "bg-neutral-800"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

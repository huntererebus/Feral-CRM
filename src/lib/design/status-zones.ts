import type { ProjectStatus } from "@prisma/client";

/**
 * Groups the 13 ProjectStatus values into 5 display zones so the UI shows
 * a handful of meaningful colors instead of 13 near-indistinguishable
 * hues. Purely a display concern — src/lib/project-status.ts's transition
 * graph remains the only source of truth for what's actually reachable.
 */
export type StatusZone = "production" | "client-review" | "revision" | "complete" | "archived";

export type StatusDisplay = {
  zone: StatusZone;
  /** Short, human label for the status — what a user reads, not the enum value. */
  label: string;
};

const STATUS_DISPLAY: Record<ProjectStatus, StatusDisplay> = {
  NEW: { zone: "production", label: "New" },
  UPLOADED: { zone: "production", label: "Footage uploaded" },
  AWAITING_ASSIGNMENT: { zone: "production", label: "Awaiting assignment" },
  ASSIGNED: { zone: "production", label: "Assigned" },
  IN_EDITING: { zone: "production", label: "In editing" },
  INTERNAL_REVIEW: { zone: "production", label: "Internal review" },
  CLIENT_REVIEW: { zone: "client-review", label: "Client review" },
  REVISION_REQUESTED: { zone: "revision", label: "Revision requested" },
  REVISION_IN_PROGRESS: { zone: "revision", label: "Revision in progress" },
  FINAL_REVIEW: { zone: "client-review", label: "Final review" },
  APPROVED: { zone: "complete", label: "Approved" },
  COMPLETED: { zone: "complete", label: "Completed" },
  ARCHIVED: { zone: "archived", label: "Archived" },
};

export function statusDisplay(status: ProjectStatus): StatusDisplay {
  const display = STATUS_DISPLAY[status];
  // Every ProjectStatus key really is populated above; same
  // noUncheckedIndexedAccess situation as project-status.ts's lookups.
  if (!display) throw new Error(`No status display configured for "${status}".`);
  return display;
}

/**
 * The canonical "happy path" ordering for the stepper — display only. A
 * project that's taken a kickback (e.g. INTERNAL_REVIEW -> IN_EDITING) is
 * shown at its current step, not its historical path; this list exists so
 * the stepper has a stable left-to-right order to render, not to encode
 * transition validity (project-status.ts already owns that).
 */
export const STATUS_STEPPER_ORDER: ProjectStatus[] = [
  "NEW",
  "UPLOADED",
  "AWAITING_ASSIGNMENT",
  "ASSIGNED",
  "IN_EDITING",
  "INTERNAL_REVIEW",
  "CLIENT_REVIEW",
  "FINAL_REVIEW",
  "APPROVED",
  "COMPLETED",
];

import type { HTMLAttributes } from "react";

// Deliberately a hairline border + minimal radius, not the soft-shadow
// identical-rounded-card look — see the Stage 8 design plan in SETUP.md.
export function Panel({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded border border-neutral-800 bg-neutral-900/60 ${className}`} {...props} />;
}

export function PanelHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`border-b border-neutral-800 px-4 py-3 ${className}`} {...props} />;
}

export function PanelBody({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${className}`} {...props} />;
}

import Link from "next/link";
import { listNotifications } from "@/lib/services/notifications";
import type { SessionUser } from "@/lib/rbac";

export async function NotificationsBell({ user }: { user: SessionUser }) {
  const unread = await listNotifications(user, { unreadOnly: true });

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center rounded px-2 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
      aria-label={unread.length > 0 ? `${unread.length} unread notifications` : "Notifications"}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path d="M10 2a6 6 0 00-6 6v3.09c0 .58-.2 1.14-.57 1.59L2.4 14.2a1 1 0 00.76 1.65h13.68a1 1 0 00.76-1.65l-1.03-1.52a2.5 2.5 0 01-.57-1.59V8a6 6 0 00-6-6z" />
        <path d="M8.5 17a1.5 1.5 0 003 0h-3z" />
      </svg>
      {unread.length > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-primary px-1 font-mono text-[10px] font-semibold text-white">
          {unread.length > 9 ? "9+" : unread.length}
        </span>
      )}
    </Link>
  );
}

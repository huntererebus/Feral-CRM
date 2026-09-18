import { requireSession } from "@/lib/session";
import { listNotifications } from "@/lib/services/notifications";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { markReadAction, markAllReadAction } from "./actions";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function NotificationsPage() {
  const { user } = await requireSession();
  const notifications = await listNotifications(user);
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-100">Notifications</h1>
        {hasUnread && (
          <form action={markAllReadAction}>
            <Button type="submit" variant="ghost" size="sm">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="Updates on your projects will show up here." />
      ) : (
        <Panel className="divide-y divide-neutral-900">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start justify-between gap-4 px-4 py-3 ${!n.readAt ? "bg-neutral-900/40" : ""}`}>
              <div className="flex-1">
                {n.linkUrl ? (
                  <a href={n.linkUrl} className="text-sm font-medium text-neutral-100 hover:underline">
                    {n.title}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-neutral-100">{n.title}</p>
                )}
                {n.body && <p className="mt-0.5 text-sm text-neutral-400">{n.body}</p>}
                <p className="mt-1 font-mono text-xs text-neutral-600">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.readAt && (
                <form action={markReadAction.bind(null, n.id)}>
                  <button type="submit" className="text-xs text-neutral-500 hover:text-neutral-200">
                    Mark read
                  </button>
                </form>
              )}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

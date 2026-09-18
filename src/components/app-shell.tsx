import { navItemsForRole } from "./nav-items";
import { SidebarNav } from "./sidebar-nav";
import { NotificationsBell } from "./notifications-bell";
import { SignOutButton } from "./sign-out-button";
import { Avatar } from "./ui/avatar";
import type { SessionUser } from "@/lib/rbac";

export async function AppShell({
  user,
  orgName,
  userName,
  children,
}: {
  user: SessionUser;
  orgName: string | null;
  userName: string;
  children: React.ReactNode;
}) {
  const navItems = navItemsForRole(user.role);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-neutral-900 p-4">
        <div className="flex flex-col gap-6">
          <div className="px-1">
            <p className="font-mono text-xs uppercase tracking-wide text-neutral-500">{orgName ?? "Reel"}</p>
          </div>
          <SidebarNav items={navItems} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-900 px-6 py-3">
          <div />
          <div className="flex items-center gap-4">
            <NotificationsBell user={user} />
            <div className="flex items-center gap-2">
              <Avatar name={userName} size="sm" />
              <span className="text-sm text-neutral-300">{userName}</span>
            </div>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

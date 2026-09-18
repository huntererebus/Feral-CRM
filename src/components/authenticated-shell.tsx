import { requireSession } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/tenant";
import { db } from "@/lib/db";
import { AppShell } from "./app-shell";

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const [org, dbUser] = await Promise.all([
    getCurrentOrganization(),
    db.user.findUnique({ where: { id: user.id }, select: { name: true } }),
  ]);

  return (
    <AppShell user={user} orgName={org?.name ?? null} userName={dbUser?.name ?? "Account"}>
      {children}
    </AppShell>
  );
}

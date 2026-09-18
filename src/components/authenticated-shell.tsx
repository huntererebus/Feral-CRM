import { redirect } from "next/navigation";
import { requireSession, UnauthenticatedError, TenantMismatchError } from "@/lib/session";
import { getCurrentOrganization } from "@/lib/tenant";
import { db } from "@/lib/db";
import { AppShell } from "./app-shell";

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch (err) {
    // Not logged in, or logged in against the wrong org subdomain — either
    // way, the right UI response is "go sign in here," not a crash. A
    // TenantMismatchError session is also just cleared by re-login (the
    // credentials check at sign-in time is what actually enforces which
    // org a session belongs to; see auth.ts).
    if (err instanceof UnauthenticatedError || err instanceof TenantMismatchError) {
      redirect("/login");
    }
    throw err;
  }

  const { user } = session;
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

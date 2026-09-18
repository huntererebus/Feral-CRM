import Link from "next/link";
import { getCurrentOrganization } from "@/lib/tenant";
import { LoginForm } from "./login-form";
import { Panel, PanelBody } from "@/components/ui/panel";

export default async function LoginPage() {
  const org = await getCurrentOrganization();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {org?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- org-supplied URL, not a static asset
            <img src={org.logoUrl} alt={org.name} className="mx-auto mb-3 h-10" />
          ) : (
            <p className="font-mono text-sm uppercase tracking-wide text-neutral-500">{org?.name ?? "Reel"}</p>
          )}
          <h1 className="mt-1 text-lg font-semibold text-neutral-100">Sign in</h1>
        </div>

        <Panel>
          <PanelBody>
            <LoginForm />
          </PanelBody>
        </Panel>

        <p className="mt-4 text-center text-sm text-neutral-500">
          <Link href="/forgot-password" className="hover:text-neutral-300 hover:underline">
            Forgot your password?
          </Link>
        </p>
      </div>
    </main>
  );
}

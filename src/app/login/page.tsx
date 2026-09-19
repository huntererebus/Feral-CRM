import Link from "next/link";
import { getCurrentOrganization } from "@/lib/tenant";
import { LoginForm } from "./login-form";
import { OAuthButtons } from "./oauth-buttons";
import { Panel, PanelBody } from "@/components/ui/panel";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "That account isn't set up here yet. Ask your org admin to invite you, or sign in with the account you were invited under.",
};

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const org = await getCurrentOrganization();
  const oauthError = searchParams.error ? OAUTH_ERROR_MESSAGES[searchParams.error] ?? "Sign-in failed. Please try again." : null;

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
          <PanelBody className="flex flex-col gap-4">
            {oauthError && <p className="text-sm text-red-400">{oauthError}</p>}
            <OAuthButtons />
            <div className="flex items-center gap-3 text-xs text-neutral-600">
              <div className="h-px flex-1 bg-neutral-800" />
              or
              <div className="h-px flex-1 bg-neutral-800" />
            </div>
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

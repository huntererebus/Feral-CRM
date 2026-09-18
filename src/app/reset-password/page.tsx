import { Panel, PanelBody } from "@/components/ui/panel";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-lg font-semibold text-neutral-100">Set a new password</h1>
        {token ? (
          <Panel>
            <PanelBody>
              <ResetPasswordForm token={token} />
            </PanelBody>
          </Panel>
        ) : (
          <p className="text-center text-sm text-red-400">This reset link is missing its token.</p>
        )}
      </div>
    </main>
  );
}

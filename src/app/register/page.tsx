import { Panel, PanelBody } from "@/components/ui/panel";
import { RegisterForm } from "./register-form";

export default function RegisterPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-lg font-semibold text-neutral-100">Finish setting up your account</h1>
        {token ? (
          <Panel>
            <PanelBody>
              <RegisterForm token={token} />
            </PanelBody>
          </Panel>
        ) : (
          <p className="text-center text-sm text-red-400">This invite link is missing its token.</p>
        )}
      </div>
    </main>
  );
}

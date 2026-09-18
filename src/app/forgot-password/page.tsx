import Link from "next/link";
import { Panel, PanelBody } from "@/components/ui/panel";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-lg font-semibold text-neutral-100">Reset your password</h1>
        <Panel>
          <PanelBody>
            <ForgotPasswordForm />
          </PanelBody>
        </Panel>
        <p className="mt-4 text-center text-sm text-neutral-500">
          <Link href="/login" className="hover:text-neutral-300 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

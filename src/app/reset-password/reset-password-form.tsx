"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { resetPasswordAction, type ActionResult } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Resetting…" : "Reset password"}
    </Button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useFormState(resetPasswordAction, initialState);

  if (state.status === "success") {
    return (
      <p className="text-sm text-neutral-300">
        Your password has been reset.{" "}
        <Link href="/login" className="text-brand-primary hover:underline">
          Sign in
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-xs font-medium text-neutral-400">
          New password
        </label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={10} />
      </div>
      {state.status === "error" && <p className="text-sm text-red-400">{state.message}</p>}
      <SubmitButton />
    </form>
  );
}

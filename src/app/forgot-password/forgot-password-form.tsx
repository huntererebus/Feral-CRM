"use client";

import { useFormState, useFormStatus } from "react-dom";
import { forgotPasswordAction, type ActionResult } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: true, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(forgotPasswordAction, initialState);

  if (state.message && state.ok) {
    return <p className="text-sm text-neutral-300">{state.message}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium text-neutral-400">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
      <SubmitButton />
    </form>
  );
}

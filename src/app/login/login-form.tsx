"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type ActionResult } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium text-neutral-400">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-medium text-neutral-400">
          Password
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {!state.ok && <p className="text-sm text-red-400">{state.message}</p>}
      <SubmitButton />
    </form>
  );
}

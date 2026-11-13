"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function AdminLoginForm() {
  const [state, formAction] = useActionState(adminLogin, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="password" className="mb-1 block font-semibold">
          Admin password
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

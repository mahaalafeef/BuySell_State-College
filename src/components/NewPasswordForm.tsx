"use client";

import { useActionState } from "react";
import { changePassword, resetPassword, type PasswordState } from "@/app/password-actions";
import { SubmitButton } from "./SubmitButton";

type Props = { mode: "reset"; token: string } | { mode: "change" };

/** Two password boxes. Used for the reset link (mode "reset") and for changing it inside the account (mode "change"). */
export function NewPasswordForm(props: Props) {
  const action: (prev: PasswordState, fd: FormData) => Promise<PasswordState> =
    props.mode === "reset" ? resetPassword : changePassword;
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {props.mode === "reset" && <input type="hidden" name="t" value={props.token} />}
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-md bg-ok/10 p-3 text-ok">
          Your password was changed.
        </p>
      )}
      <div>
        <label htmlFor="np-password" className="mb-1 block font-semibold">
          New password
        </label>
        <input id="np-password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="np-confirm" className="mb-1 block font-semibold">
          Type it again
        </label>
        <input id="np-confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <SubmitButton pendingText="Saving…" className="btn-primary w-full">
        {props.mode === "reset" ? "Save password and log in" : "Change password"}
      </SubmitButton>
    </form>
  );
}

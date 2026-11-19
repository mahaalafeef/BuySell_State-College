"use client";

import { useActionState } from "react";
import { completePasswordReset } from "@/app/member-actions";
import { SubmitButton } from "./SubmitButton";

export function NewPasswordForm({ t }: { t: string }) {
  const [state, action] = useActionState(completePasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="t" value={t} />
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="reset-password" className="mb-1 block font-semibold">
          New password
        </label>
        <input id="reset-password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="reset-confirm" className="mb-1 block font-semibold">
          Type it again
        </label>
        <input id="reset-confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <SubmitButton pendingText="Saving…" className="btn-primary w-full">
        Save new password and enter
      </SubmitButton>
    </form>
  );
}

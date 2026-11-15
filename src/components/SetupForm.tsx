"use client";

import { useActionState } from "react";
import { setMemberPassword } from "@/app/member-actions";
import { SubmitButton } from "./SubmitButton";

export function SetupForm({ m, c }: { m: string; c: string }) {
  const [state, action] = useActionState(setMemberPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="m" value={m} />
      <input type="hidden" name="c" value={c} />
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="setup-password" className="mb-1 block font-semibold">
          Choose a password
        </label>
        <input id="setup-password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="setup-confirm" className="mb-1 block font-semibold">
          Type it again
        </label>
        <input id="setup-confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <SubmitButton pendingText="Saving…" className="btn-primary w-full">
        Save password and enter
      </SubmitButton>
    </form>
  );
}

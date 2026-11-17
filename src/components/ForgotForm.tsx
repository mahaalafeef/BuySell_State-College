"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/password-actions";
import { SubmitButton } from "./SubmitButton";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="rounded-xl bg-ok/10 p-5 text-ok">
        Request sent. If that number has an account, we&rsquo;ll message you on WhatsApp with a link to choose a new
        password, usually within a day. The link works once and expires after 24 hours.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="forgot-phone" className="mb-1 block font-semibold">
          WhatsApp number you joined with
        </label>
        <input id="forgot-phone" name="phone" required autoComplete="tel" placeholder="+1 555 123 4567" className="input" />
      </div>
      <SubmitButton pendingText="Sending…" className="btn-primary w-full">
        Send reset request
      </SubmitButton>
    </form>
  );
}

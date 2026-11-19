"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/reset-actions";
import { SubmitButton } from "./SubmitButton";

/** "Forgot your password?" Asks the admin for a reset link, which is sent to the member on WhatsApp. */
export function ForgotPassword({ initialNumber }: { initialNumber?: string }) {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  const start = initialNumber ? (/^\d+$/.test(initialNumber) ? `+${initialNumber}` : initialNumber) : "";

  return (
    <section aria-labelledby="forgot-title" className="space-y-3 rounded-xl border border-line bg-white p-5">
      <h2 id="forgot-title" className="text-lg font-semibold">
        Forgot your password?
      </h2>

      {state?.ok ? (
        <p role="status" className="rounded-md bg-ok/10 p-3 text-ok">
          Thanks! If that Gmail address or number has an account, we have sent a link to the Gmail address on file
          (check your inbox and spam folder). If we do not have a Gmail address for you, our team has been told and
          will message you on WhatsApp.
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <p className="text-sm text-muted">
            Enter the Gmail address or WhatsApp number you joined with. We will send you a link to choose a new password.
          </p>
          {state?.error && (
            <p role="alert" className="rounded-md bg-danger/10 p-2.5 text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="hidden" aria-hidden="true">
            <input name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="forgot-phone" className="mb-1 block font-semibold">
              Gmail address or WhatsApp number
            </label>
            <input
              id="forgot-phone"
              name="phone"
              required
              defaultValue={start}
              autoComplete="username"
              className="input"
            />
          </div>
          <SubmitButton pendingText="Sending…" className="btn-ghost">
            Ask for a password reset link
          </SubmitButton>
        </form>
      )}
    </section>
  );
}

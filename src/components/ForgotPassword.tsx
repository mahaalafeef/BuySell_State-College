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
          Thanks! If that account exists, our team has been told. They will contact you (by email or on WhatsApp) with a
          link to choose a new password.
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <p className="text-sm text-muted">
            Enter the email you signed up with (or your WhatsApp number). We will check it is you and send you a link to choose a new password.
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
              Email or WhatsApp number
            </label>
            <input
              id="forgot-phone"
              name="identifier"
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

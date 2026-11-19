"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/signup-actions";
import { SubmitButton } from "./SubmitButton";

export function SignupForm() {
  const [state, action] = useActionState(signUp, undefined);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}
      <div className="hidden" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="su-name" className="mb-1 block font-semibold">
          Your name
        </label>
        <input id="su-name" name="name" required autoComplete="name" className="input" />
        {fe.name && <p className="mt-1 text-sm text-danger">{fe.name}</p>}
      </div>

      <div>
        <label htmlFor="su-email" className="mb-1 block font-semibold">
          Email
        </label>
        <input id="su-email" name="email" type="email" required autoComplete="email" className="input" />
        {fe.email && <p className="mt-1 text-sm text-danger">{fe.email}</p>}
      </div>

      <div>
        <label htmlFor="su-password" className="mb-1 block font-semibold">
          Password
        </label>
        <input
          id="su-password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className="input"
        />
        <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
        {fe.password && <p className="mt-1 text-sm text-danger">{fe.password}</p>}
      </div>

      <div>
        <label htmlFor="su-confirm" className="mb-1 block font-semibold">
          Confirm password
        </label>
        <input id="su-confirm" name="confirm" type="password" required autoComplete="new-password" className="input" />
        {fe.confirm && <p className="mt-1 text-sm text-danger">{fe.confirm}</p>}
      </div>

      <div>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
          <span className="text-sm">
            I agree to the{" "}
            <Link href="/terms" className="underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {fe.consent && <p className="mt-1 text-sm text-danger">{fe.consent}</p>}
      </div>

      <SubmitButton pendingText="Creating your account…" className="btn-primary w-full">
        Create account
      </SubmitButton>

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand underline">
          Log in
        </Link>
        .
      </p>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { memberLogin } from "@/app/member-actions";
import { SubmitButton } from "./SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(memberLogin, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="login-id" className="mb-1 block font-semibold">
          Email or WhatsApp number
        </label>
        <input
          id="login-id"
          name="identifier"
          required
          autoComplete="username"
          placeholder="you@example.com"
          className="input"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="mb-1 block font-semibold">
          Password
        </label>
        <input id="login-password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <SubmitButton pendingText="Logging in…" className="btn-primary w-full">
        Log in
      </SubmitButton>
      <p className="text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-brand underline">
          Create an account
        </Link>{" "}
        with your email. If you joined through WhatsApp, log in with your WhatsApp number, or open the personal link we sent you to choose your password.
      </p>
    </form>
  );
}

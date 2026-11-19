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
        <label htmlFor="login-phone" className="mb-1 block font-semibold">
          Gmail address or WhatsApp number
        </label>
        <input
          id="login-phone"
          name="phone"
          required
          autoComplete="username"
          placeholder="name@gmail.com"
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
        First time? Open the link we emailed you to choose your password. Not a member yet?{" "}
        <Link href="/join" className="font-semibold text-brand underline">
          Request to join
        </Link>
        .
      </p>
    </form>
  );
}

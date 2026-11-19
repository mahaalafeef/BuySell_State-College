"use client";

import { useActionState } from "react";
import type { MessageState } from "@/app/message-actions";
import { SubmitButton } from "./SubmitButton";

export function ReportForm({ action }: { action: (prev: MessageState, fd: FormData) => Promise<MessageState> }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <details className="rounded-lg border border-line bg-white p-3">
      <summary className="cursor-pointer font-semibold">Something wrong? Report this conversation</summary>
      {state?.ok ? (
        <p role="status" className="mt-2 text-ok">
          Thanks. The admin has been told and will take a look.
        </p>
      ) : (
        <form action={formAction} className="mt-3 space-y-2">
          <label htmlFor="report-reason" className="block text-sm font-semibold">
            What is the problem? (optional)
          </label>
          <input id="report-reason" name="reason" maxLength={300} className="input" />
          {state?.error && (
            <p role="alert" className="text-danger">
              {state.error}
            </p>
          )}
          <SubmitButton pendingText="Sending…" className="btn-ghost">
            Report to the admin
          </SubmitButton>
        </form>
      )}
    </details>
  );
}

"use client";

import { useActionState } from "react";
import type { MessageState } from "@/app/message-actions";
import { MAX_MESSAGE_LENGTH } from "@/lib/messageRules";
import { SubmitButton } from "./SubmitButton";

export function MessageForm({ action }: { action: (prev: MessageState, fd: FormData) => Promise<MessageState> }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="message-body" className="block font-semibold">
        Your message
      </label>
      {/* the key changes after each send, which clears the box */}
      <textarea
        key={state?.n ?? 0}
        id="message-body"
        name="body"
        rows={3}
        required
        maxLength={MAX_MESSAGE_LENGTH}
        className="input"
        placeholder="Write your message…"
      />
      {state?.error && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
      <SubmitButton pendingText="Sending…" className="btn-primary">
        Send
      </SubmitButton>
    </form>
  );
}

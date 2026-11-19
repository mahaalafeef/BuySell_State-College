"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage, startConversation } from "@/app/message-actions";
import { MAX_MESSAGE_LENGTH } from "@/lib/messages";
import { SubmitButton } from "./SubmitButton";

/** Reply box inside an existing conversation. */
export function ReplyForm({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState(sendMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}
      <label htmlFor="reply-body" className="sr-only">
        Your message
      </label>
      <textarea id="reply-body" name="body" required maxLength={MAX_MESSAGE_LENGTH} rows={3} placeholder="Write a message…" className="input" />
      <SubmitButton pendingText="Sending…" className="btn-primary">
        Send
      </SubmitButton>
    </form>
  );
}

/** First message to a seller, shown on a listing page. */
export function NewMessageForm({ listingId }: { listingId: string }) {
  const [state, action] = useActionState(startConversation, undefined);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="listingId" value={listingId} />
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}
      <label htmlFor="first-message" className="sr-only">
        Your message to the seller
      </label>
      <textarea
        id="first-message"
        name="body"
        required
        maxLength={MAX_MESSAGE_LENGTH}
        rows={3}
        placeholder="Hi! Is this still available?"
        className="input"
      />
      <SubmitButton pendingText="Sending…" className="btn-primary">
        Send message
      </SubmitButton>
    </form>
  );
}

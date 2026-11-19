"use client";

import { OPEN_CHAT_EVENT, type OpenChatDetail } from "./MessagesWidget";

/** Opens the chat pop-up (from the header, or the listing page). */
export function OpenChatButton({
  detail,
  className,
  children,
}: {
  detail?: OpenChatDetail;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail: detail ?? {} }))}
    >
      {children}
    </button>
  );
}

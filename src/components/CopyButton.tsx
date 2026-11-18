"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy message" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable: the message can still be sent with the WhatsApp button */
        }
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

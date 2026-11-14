"use client";

import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitSupport } from "@/app/support-actions";
import { SubmitButton } from "./SubmitButton";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "Hi! I can answer questions about buying, selling, and housing on this site. What do you need help with?",
};
const SUGGESTIONS = ["How do I post a listing?", "How do I edit my listing?", "How does approval work?"];
const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "");

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "human">("chat");
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy, view, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open && view === "chat") inputRef.current?.focus();
  }, [open, view]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        // Assistant isn't set up: go straight to leaving a message
        setMessages([...next, { role: "assistant", content: "The assistant isn't available right now. Please leave a message for our team." }]);
        setView("human");
        return;
      }
      if (!res.ok || !data.reply) throw new Error(data.error || "failed");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const text = err instanceof Error && err.message !== "failed" ? err.message : "Sorry, something went wrong. Please try again, or leave a message for our team.";
      setMessages([...next, { role: "assistant", content: text }]);
    } finally {
      setBusy(false);
    }
  }

  // Hide on admin pages so it never covers admin buttons
  if (pathname.startsWith("/admin")) return null;

  const transcript = messages
    .slice(1)
    .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
    .join("\n");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="fixed bottom-4 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-brand px-5 font-semibold text-white shadow-lg transition-colors hover:bg-brand-dark"
      >
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Help
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-label="Help chat"
      className="fixed bottom-4 right-4 z-40 flex h-[min(34rem,calc(100dvh-5rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
    >
      <header className="flex items-center justify-between bg-gradient-to-br from-brand-dark to-brand px-4 py-3 text-white">
        <div>
          <p className="font-display text-lg font-bold leading-tight">Help</p>
          <p className="text-sm text-white/80">{view === "chat" ? "Ask a question" : "Talk to a person"}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close help"
          className="grid h-10 w-10 place-items-center rounded-full text-2xl leading-none hover:bg-white/15"
        >
          ×
        </button>
      </header>

      {view === "chat" ? (
        <>
          <div ref={logRef} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <p
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 ${
                  m.role === "user" ? "ml-auto bg-brand text-white" : "bg-paper"
                }`}
              >
                {m.content}
              </p>
            ))}
            {busy && <p className="w-fit rounded-2xl bg-paper px-3.5 py-2 text-muted">Typing…</p>}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:border-brand hover:text-brand"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-line p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question"
                aria-label="Your question"
                maxLength={1000}
                className="input"
              />
              <button type="submit" disabled={busy || !input.trim()} className="btn-primary">
                Send
              </button>
            </form>
            <button
              type="button"
              onClick={() => setView("human")}
              className="mt-2 w-full text-center text-sm font-semibold text-brand underline"
            >
              Talk to a person
            </button>
          </div>
        </>
      ) : (
        <SupportForm transcript={transcript} onBack={() => setView("chat")} />
      )}
    </section>
  );
}

function SupportForm({ transcript, onBack }: { transcript: string; onBack: () => void }) {
  const [support, supportAction] = useActionState(submitSupport, undefined);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {support?.ok ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-ok/10 p-3 text-ok" role="status">
            Thanks! Your message was sent. We&rsquo;ll reply using the contact details you gave us.
          </p>
          <button type="button" onClick={onBack} className="btn-ghost w-full">
            Back to chat
          </button>
        </div>
      ) : (
        <form action={supportAction} className="space-y-3">
          <p className="text-sm text-muted">
            Leave a message for our team. We reply by email or phone, so this isn&rsquo;t a live chat.
          </p>
          {support?.error && (
            <p role="alert" className="rounded-md bg-danger/10 p-2.5 text-sm text-danger">
              {support.error}
            </p>
          )}
          <div>
            <label htmlFor="support-name" className="mb-1 block text-sm font-semibold">
              Your name
            </label>
            <input id="support-name" name="name" required autoComplete="name" className="input" />
          </div>
          <div>
            <label htmlFor="support-contact" className="mb-1 block text-sm font-semibold">
              Email or phone number
            </label>
            <input id="support-contact" name="contact" required autoComplete="email" className="input" />
          </div>
          <div>
            <label htmlFor="support-message" className="mb-1 block text-sm font-semibold">
              How can we help?
            </label>
            <textarea id="support-message" name="message" required rows={4} maxLength={2000} className="input" />
          </div>
          <input type="hidden" name="transcript" value={transcript} />
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <SubmitButton pendingText="Sending…" className="btn-primary w-full">
            Send message
          </SubmitButton>
          {SUPPORT_WHATSAPP && (
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full"
            >
              Or message us on WhatsApp
            </a>
          )}
          <button type="button" onClick={onBack} className="w-full text-center text-sm underline">
            Back to chat
          </button>
        </form>
      )}
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendChat, startChat } from "@/app/message-actions";
import { MAX_MESSAGE_LENGTH, MESSAGE_NOTICE } from "@/lib/messages";

type ConvoSummary = {
  id: string;
  otherName: string;
  listingTitle: string;
  role: "buying" | "selling";
  unread: boolean;
  lastBody: string;
  lastFromMe: boolean;
  when: string;
};
type ThreadMessage = { id: string; mine: boolean; body: string; when: string };
type Thread = { id: string; otherName: string; listingId: string | null; listingTitle: string; canReply: boolean; messages: ThreadMessage[] };
type NewChat = { listingId: string; listingTitle: string; sellerName: string };
type View = { kind: "list" } | { kind: "thread"; id: string } | { kind: "new"; chat: NewChat };

/** Other parts of the site open the pop-up by sending this window event. */
export const OPEN_CHAT_EVENT = "bsc:open-chat";
export type OpenChatDetail = { conversationId?: string; newChat?: NewChat };

/**
 * A chat bubble that stays on every page (it lives in the site layout), so members can keep browsing while they
 * message. It checks for new messages in the background and shows how many are unread.
 */
export function MessagesWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  const [convos, setConvos] = useState<ConvoSummary[]>([]);
  const [unread, setUnread] = useState(0);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const refreshInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: ConvoSummary[]; unread: number };
      setConvos(data.conversations);
      setUnread(data.unread);
    } catch {
      /* offline: try again next time */
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Thread;
      setThread((prev) => (prev && prev.id === data.id && prev.messages.length === data.messages.length && prev.canReply === data.canReply ? prev : data));
    } catch {
      /* offline: try again next time */
    }
  }, []);

  // Let buttons elsewhere on the site (e.g. "Message the seller") open the pop-up
  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<OpenChatDetail>).detail ?? {};
      setError("");
      setText("");
      setOpen(true);
      if (detail.conversationId) {
        setThread(null);
        setView({ kind: "thread", id: detail.conversationId });
      } else if (detail.newChat) {
        setView({ kind: "new", chat: detail.newChat });
      } else {
        setView({ kind: "list" });
      }
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  // Check the inbox in the background: often while the list is showing, rarely while closed
  useEffect(() => {
    void refreshInbox();
    const ms = open && view.kind === "list" ? 8000 : 20000;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refreshInbox();
    }, ms);
    return () => clearInterval(t);
  }, [open, view.kind, refreshInbox]);

  // Keep the open conversation fresh
  const threadId = view.kind === "thread" ? view.id : null;
  useEffect(() => {
    if (!open || !threadId) return;
    void loadThread(threadId).then(() => refreshInbox());
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void loadThread(threadId);
    }, 5000);
    return () => clearInterval(t);
  }, [open, threadId, loadThread, refreshInbox]);

  // Scroll to the newest message
  const messageCount = thread?.messages.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messageCount, threadId, open]);

  async function submit() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      if (view.kind === "new") {
        const r = await startChat(view.chat.listingId, body);
        if (r.error || !r.id) {
          setError(r.error ?? "Couldn't send. Please try again.");
        } else {
          setText("");
          setThread(null);
          setView({ kind: "thread", id: r.id });
          void refreshInbox();
        }
      } else if (view.kind === "thread") {
        const r = await sendChat(view.id, body);
        if (r.error) {
          setError(r.error);
        } else {
          setText("");
          await loadThread(view.id);
        }
      }
    } catch {
      setError("Couldn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  // Never cover the admin pages
  if (pathname.startsWith("/admin")) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setView({ kind: "list" });
          setOpen(true);
        }}
        aria-expanded={false}
        aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
        className="fixed bottom-4 left-4 z-40 flex h-12 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-white shadow-lg transition-colors hover:bg-brand-dark"
      >
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        </svg>
        Messages
        {unread > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-danger px-1.5 text-xs">{unread}</span>}
      </button>
    );
  }

  const title =
    view.kind === "list" ? "Messages" : view.kind === "new" ? `Message ${view.chat.sellerName}` : thread ? thread.otherName : "Conversation";
  const subtitle = view.kind === "new" ? view.chat.listingTitle : view.kind === "thread" ? thread?.listingTitle : undefined;
  const showComposer = view.kind === "new" || (view.kind === "thread" && thread?.canReply);

  return (
    <section
      role="dialog"
      aria-label="Messages"
      className="fixed bottom-4 left-4 z-50 flex h-[min(34rem,calc(100dvh-5rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
    >
      <header className="flex items-center gap-2 bg-ink px-3 py-3 text-white">
        {view.kind !== "list" && (
          <button
            type="button"
            onClick={() => {
              setView({ kind: "list" });
              setError("");
              setText("");
            }}
            aria-label="Back to all messages"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl leading-none hover:bg-white/15"
          >
            ‹
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold leading-tight">{title}</p>
          {subtitle && <p className="truncate text-sm text-white/80">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close messages"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-2xl leading-none hover:bg-white/15"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {view.kind === "list" &&
          (convos.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">No messages yet. Open a listing and tap &ldquo;Message the seller&rdquo; to start.</p>
          ) : (
            <ul>
              {convos.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setThread(null);
                      setView({ kind: "thread", id: c.id });
                    }}
                    className="block w-full border-b border-line px-4 py-3 text-left hover:bg-paper"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">
                        {c.unread && <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-danger align-middle" aria-label="Unread" />}
                        {c.otherName}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{c.when}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {c.role === "buying" ? "Buying" : "Selling"}: {c.listingTitle}
                    </span>
                    <span className="mt-0.5 block truncate text-sm">
                      {c.lastFromMe ? "You: " : ""}
                      {c.lastBody}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ))}

        {view.kind === "new" && (
          <div className="space-y-2 p-4">
            <p className="text-sm">Write your first message to {view.chat.sellerName}. It will also be saved in your Messages.</p>
          </div>
        )}

        {view.kind === "thread" && (
          <div role="log" aria-live="polite" className="space-y-2 p-3">
            {!thread && <p className="p-4 text-center text-sm text-muted">Loading…</p>}
            {thread?.messages.map((m) => (
              <div key={m.id} className={m.mine ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${m.mine ? "bg-brand text-white" : "bg-paper"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[11px] ${m.mine ? "text-white/70" : "text-muted"}`}>{m.when}</p>
                </div>
              </div>
            ))}
            {thread && !thread.canReply && (
              <p className="rounded-lg bg-amber-100 p-2.5 text-center text-sm text-amber-900">This person is no longer on the site, so you can&rsquo;t reply.</p>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {showComposer && (
        <div className="border-t border-line p-3">
          {error && (
            <p role="alert" className="mb-2 rounded-md bg-danger/10 p-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex items-end gap-2">
            <label htmlFor="chat-popup-text" className="sr-only">
              Your message
            </label>
            <textarea
              id="chat-popup-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={2}
              placeholder="Write a message…"
              className="input min-h-0 flex-1 resize-none"
            />
            <button type="button" onClick={() => void submit()} disabled={sending || text.trim() === ""} className="btn-primary">
              {sending ? "…" : "Send"}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted">{MESSAGE_NOTICE}</p>
        </div>
      )}
    </section>
  );
}

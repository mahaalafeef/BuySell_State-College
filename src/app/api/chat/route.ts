import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/chatPrompt";
import { SITE_NAME } from "@/lib/config";
import { checkLimit, ipHash, recordEvent } from "@/lib/ratelimit";
import { getAutoApprove } from "@/lib/settings";

export const maxDuration = 30;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const PER_IP_PER_HOUR = 30;
const DAILY_CAP = Number(process.env.CHAT_DAILY_LIMIT || 500);

type Msg = { role: "user" | "assistant"; content: string };

function clean(input: unknown): Msg[] | null {
  if (!Array.isArray(input)) return null;
  const msgs: Msg[] = [];
  for (const m of input.slice(-12)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const content = m.content.trim().slice(0, 1000);
    if (content) msgs.push({ role: m.role, content });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift(); // must start with the user
  return msgs.length && msgs[msgs.length - 1].role === "user" ? msgs : null;
}

export async function POST(request: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  // Only accept requests from this site's own pages
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const messages = clean(body?.messages);
  if (!messages) return NextResponse.json({ error: "Please type a message." }, { status: 400 });

  const hash = ipHash(request.headers);
  const limited = await checkLimit("chat", hash, PER_IP_PER_HOUR, DAILY_CAP);
  if (limited) {
    return NextResponse.json(
      {
        error:
          limited === "ip"
            ? "You've sent a lot of messages. Please try again later, or leave a message for our team."
            : "The assistant is very busy right now. Please leave a message for our team.",
      },
      { status: 429 },
    );
  }
  await recordEvent("chat", hash);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: buildSystemPrompt({ siteName: SITE_NAME, autoApprove: await getAutoApprove() }),
        messages,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      console.error("Chat API error:", res.status, await res.text());
      return NextResponse.json({ error: "The assistant couldn't answer just now." }, { status: 502 });
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const reply = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim();

    return NextResponse.json({
      reply: reply || "Sorry, I couldn't answer that. You can tap \"Talk to a person\" below.",
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "The assistant couldn't answer just now." }, { status: 502 });
  }
}

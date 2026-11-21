// Talking to the AI: shared by "Quick post with AI" and the listing form's "Writing helper". Server only.

export const AREA = process.env.SITE_AREA || "State College, Pennsylvania, USA and the neighboring towns around Penn State University";

export type Provider = "anthropic" | "gemini";
export type Image = { mediaType: string; data: string };
export type Outcome = { ok: true; text: string } | { ok: false; reason: string };

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

/** Which AI to use: AI_PROVIDER picks one; otherwise whichever key is set (Anthropic first). null means no AI. */
export function pickProvider(): Provider | null {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const choice = process.env.AI_PROVIDER;
  if (choice === "gemini") return geminiKey ? "gemini" : null;
  if (choice === "anthropic") return anthropicKey ? "anthropic" : null;
  return anthropicKey ? "anthropic" : geminiKey ? "gemini" : null;
}

/** Most AI requests the whole site makes per day. Free plans allow few, so Gemini starts low. */
export function dailyCap(provider: Provider): number {
  return Number(process.env.AI_LISTING_DAILY_LIMIT || (provider === "gemini" ? 15 : 200));
}

export function str(v: unknown) {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

/** The JSON object inside the AI's answer, or null. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    const j = JSON.parse(text.slice(start, end + 1));
    return j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Only photos uploaded to this site's own storage are ever fetched and sent to the AI. */
export function isSitePhoto(u: unknown): u is string {
  if (typeof u !== "string" || u.length > 600) return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com") && url.pathname.startsWith("/listings/");
  } catch {
    return false;
  }
}

/** Downloads one of our own photos and packages it for the AI (more reliable than asking the AI to fetch the link). */
export async function loadImage(url: string): Promise<Image | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > 4_500_000) return null;
    const type = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const mediaType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type) ? type : "image/jpeg";
    return { mediaType, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

/** Asks the chosen AI. Images are optional. */
export async function askAi(provider: Provider, system: string, images: Image[], userText: string): Promise<Outcome> {
  return provider === "gemini"
    ? askGemini(process.env.GEMINI_API_KEY as string, system, images, userText)
    : askClaude(process.env.ANTHROPIC_API_KEY as string, system, images, userText);
}

/** Anthropic (paid): tries a backup model if the first isn't found and retries once when the service is busy. */
async function askClaude(key: string, system: string, images: Image[], userText: string): Promise<Outcome> {
  const started = Date.now();
  const models = Array.from(new Set([CLAUDE_MODEL, "claude-sonnet-5-5", "claude-haiku-5-5"]));
  const content = [
    ...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.mediaType, data: i.data } })),
    { type: "text", text: userText },
  ];
  let reason = "no answer";

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() - started > 30_000) return { ok: false, reason: "took too long" };
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model, max_tokens: 1400, system, messages: [{ role: "user", content }] }),
          signal: AbortSignal.timeout(28_000),
        });
        if (res.ok) {
          const data = (await res.json()) as { content?: { type: string; text?: string }[] };
          const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
          return { ok: true, text };
        }
        console.error("AI error (Anthropic):", model, res.status, (await res.text()).slice(0, 300)); // see these in the Vercel logs
        reason = `error ${res.status}`;
        if (res.status === 404) break; // that model isn't available: try the next one
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 1500));
          continue; // busy: try once more
        }
        return { ok: false, reason }; // bad key or bad request: trying again won't help
      } catch (err) {
        console.error("AI request failed (Anthropic):", model, err);
        reason = "no response";
        break;
      }
    }
  }
  return { ok: false, reason };
}

/** Google Gemini (has a free tier): tries backup models, and stops at once if the free limit is reached. */
async function askGemini(key: string, system: string, images: Image[], userText: string): Promise<Outcome> {
  const started = Date.now();
  const models = Array.from(new Set([process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"]));
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [...images.map((i) => ({ inlineData: { mimeType: i.mediaType, data: i.data } })), { text: userText }] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2048 },
  });
  let reason = "no answer";

  for (const model of models) {
    if (Date.now() - started > 30_000) return { ok: false, reason: "took too long" };
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(28_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
        if (!text) {
          reason = "empty answer";
          continue;
        }
        return { ok: true, text };
      }
      console.error("AI error (Gemini):", model, res.status, (await res.text()).slice(0, 300));
      if (res.status === 429) return { ok: false, reason: "the free usage limit was reached" };
      reason = `error ${res.status}`;
      if (res.status === 404 || res.status >= 500) continue; // model missing or busy: try the next one
      return { ok: false, reason }; // bad key or bad request: trying again won't help
    } catch (err) {
      console.error("AI request failed (Gemini):", model, err);
      reason = "no response";
    }
  }
  return { ok: false, reason };
}

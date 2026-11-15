// Checks a signed cookie token using only Web APIs, so it can run in middleware (Edge runtime).
// Tokens are made by signToken() in security.ts: base64url(JSON) + "." + base64url(HMAC-SHA256).

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function isValidToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), enc.encode(body));
    if (!ok) return false;
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    return typeof data.exp === "number" && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

import { createHash } from "node:crypto";
import { siteUrl } from "./members";
import { readToken, signToken } from "./security";

// A reset link is a signed token that is valid for 24 hours. It contains a fingerprint of the member's
// current password, so it stops working the moment the password changes (one use only).

const fingerprint = (passwordHash: string | null) =>
  createHash("sha256").update(passwordHash ?? "none").digest("hex").slice(0, 16);

export function resetPath(id: string, passwordHash: string | null): string {
  const token = signToken({ rp: id, h: fingerprint(passwordHash) }, 24 * 3600);
  return `/members/reset?t=${encodeURIComponent(token)}`;
}

export function resetLink(id: string, passwordHash: string | null): string {
  return `${siteUrl()}${resetPath(id, passwordHash)}`;
}

export function readResetToken(token: string | undefined): { id: string; h: string } | null {
  const t = readToken<{ rp?: string; h?: string }>(token);
  return t?.rp && t.h ? { id: t.rp, h: t.h } : null;
}

export function resetMatches(h: string, passwordHash: string | null): boolean {
  return h === fingerprint(passwordHash);
}

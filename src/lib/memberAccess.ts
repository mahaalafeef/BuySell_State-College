import { cache } from "react";
import { db } from "@/lib/db";
import { getMemberId } from "@/lib/members";
import { isAdmin } from "@/lib/session";

/**
 * True only for an approved member (checked against the database right now) or the admin.
 *
 * The middleware only checks that the sign-in cookie is validly signed, and it can't ask the
 * database. This is the real check: someone whose access was removed (or whose request was
 * deleted) still holds a valid cookie for up to 90 days, but fails here immediately.
 * Use it anywhere seller contact details are shown or handed out.
 */
export const hasMemberAccess = cache(async (): Promise<boolean> => {
  if (await isAdmin()) return true;
  const id = await getMemberId();
  if (!id) return false;
  const row = await db.joinRequest.findUnique({ where: { id }, select: { status: true } });
  return row?.status === "APPROVED";
});

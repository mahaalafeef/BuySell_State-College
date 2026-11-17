import { cache } from "react";
import { db } from "@/lib/db";
import { getMemberId } from "@/lib/members";
import { canManage, isAdmin } from "@/lib/session";

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
  return (await getActiveMember()) !== null;
});

/** The signed-in member, if they are still approved (the admin is not a member), otherwise null. */
export const getActiveMember = cache(async (): Promise<{ id: string; name: string } | null> => {
  const id = await getMemberId();
  if (!id) return null;
  const row = await db.joinRequest.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
  return row && row.status === "APPROVED" ? { id: row.id, name: row.name } : null;
});

/**
 * Can this visitor edit, change the status of, or delete this listing?
 * Yes if it belongs to their member account, or they proved ownership with the passcode or phone number.
 */
export async function canManageListing(listing: { id: string; phone: string; ownerId: string | null }): Promise<boolean> {
  if (await canManage(listing)) return true;
  if (!listing.ownerId) return false;
  const me = await getActiveMember();
  return me !== null && me.id === listing.ownerId;
}

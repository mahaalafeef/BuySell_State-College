import { db } from "./db";
import { getMemberId } from "./members";
import { isAdmin } from "./session";

/** The signed-in member's id, or null if they aren't signed in or are no longer approved. */
export async function currentMemberId(): Promise<string | null> {
  const id = await getMemberId();
  if (!id) return null;
  const row = await db.joinRequest.findUnique({ where: { id }, select: { status: true } });
  return row?.status === "APPROVED" ? id : null;
}

/** True for approved members and for the admin. */
export async function viewerIsMember(): Promise<boolean> {
  return (await isAdmin()) || (await currentMemberId()) !== null;
}

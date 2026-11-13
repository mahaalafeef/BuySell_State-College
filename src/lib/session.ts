import { cookies } from "next/headers";
import { ADMIN_SESSION_HOURS, USER_SESSION_MINUTES } from "./config";
import { readToken, signToken } from "./security";

const USER_COOKIE = "mk_session";
const ADMIN_COOKIE = "mk_admin";

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/* ---------- Seller session ---------- */
// A seller proves ownership with a passcode or phone number. We remember
// which listing ids (and/or phone) they proved, in a signed cookie.

export type UserSession = { ids: string[]; phone?: string };

export async function getUserSession(): Promise<UserSession> {
  const jar = await cookies();
  const token = readToken<UserSession>(jar.get(USER_COOKIE)?.value);
  return token ? { ids: token.ids ?? [], phone: token.phone } : { ids: [] };
}

/** Server actions only (cookies can't be written while rendering a page). */
export async function updateUserSession(patch: { addId?: string; phone?: string }) {
  const current = await getUserSession();
  const ids =
    patch.addId && !current.ids.includes(patch.addId)
      ? [...current.ids.slice(-19), patch.addId]
      : current.ids;
  const next: UserSession = { ids, phone: patch.phone ?? current.phone };
  const jar = await cookies();
  jar.set(USER_COOKIE, signToken(next, USER_SESSION_MINUTES * 60), {
    ...baseCookie,
    maxAge: USER_SESSION_MINUTES * 60,
  });
}

export async function clearUserSession() {
  (await cookies()).delete(USER_COOKIE);
}

export async function canManage(listing: { id: string; phone: string }): Promise<boolean> {
  const session = await getUserSession();
  return session.ids.includes(listing.id) || session.phone === listing.phone;
}

/* ---------- Admin session ---------- */

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return !!readToken<{ admin: boolean }>(jar.get(ADMIN_COOKIE)?.value)?.admin;
}

export async function setAdminSession() {
  const ttl = ADMIN_SESSION_HOURS * 3600;
  (await cookies()).set(ADMIN_COOKIE, signToken({ admin: true }, ttl), { ...baseCookie, maxAge: ttl });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

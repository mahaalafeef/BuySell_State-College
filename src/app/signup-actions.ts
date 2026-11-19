"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { setMemberCookie } from "@/lib/members";
import { checkLimit, ipHash, recordEvent } from "@/lib/ratelimit";
import { hashPasscode } from "@/lib/security";

export type SignupState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Optional: limit sign-ups to certain email domains, e.g. SIGNUP_ALLOWED_EMAIL_DOMAINS="psu.edu".
 * Leave it empty to let any email address sign up.
 */
function domainAllowed(email: string): boolean {
  const list = (process.env.SIGNUP_ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  if (list.length === 0) return true;
  const domain = email.split("@")[1] ?? "";
  return list.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/** Public: anyone can create an account with an email and a password. No approval step. */
export async function signUp(_prev: SignupState, fd: FormData): Promise<SignupState> {
  if (String(fd.get("website") ?? "") !== "") return { error: "Something went wrong. Please try again." }; // spam trap

  const name = String(fd.get("name") ?? "").trim().slice(0, 100);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const consent = fd.get("consent") === "on";

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please enter your name.";
  if (email.length > 254 || !EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";
  else if (!domainAllowed(email)) {
    const list = (process.env.SIGNUP_ALLOWED_EMAIL_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean).join(", ");
    fieldErrors.email = `Please use an email address that ends in ${list}.`;
  }
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  else if (password.length > 72) fieldErrors.password = "Please use 72 characters or fewer.";
  else if (password !== confirm) fieldErrors.confirm = "The two passwords don't match.";
  if (!consent) fieldErrors.consent = "Please tick the box to continue.";
  if (Object.keys(fieldErrors).length > 0) return { error: "Please fix the highlighted fields.", fieldErrors };

  const hash = ipHash(await headers());
  if (await checkLimit("join", hash, 5)) {
    return { error: "You've tried several times already. Please wait a while before trying again." };
  }
  await recordEvent("join", hash);

  const exists = await db.joinRequest.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "An account with this email already exists. Please log in instead.", fieldErrors: { email: "Already has an account." } };

  let id: string;
  try {
    const created = await db.joinRequest.create({
      data: {
        name,
        email,
        role: "Signed up with email",
        status: "APPROVED", // no approval needed
        decidedAt: new Date(),
        passwordHash: hashPasscode(password),
      },
      select: { id: true },
    });
    id = created.id;
  } catch (err) {
    // Two sign-ups with the same email at the same moment
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "An account with this email already exists. Please log in instead." };
    }
    throw err;
  }

  await setMemberCookie(id); // signed in straight away
  redirect("/");
}

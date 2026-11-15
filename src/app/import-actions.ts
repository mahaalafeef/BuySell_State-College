"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CATEGORIES,
  CONDITIONS,
  HOUSING_CATEGORIES,
  RENTAL_CONDITION,
  SALE_CATEGORIES,
} from "@/lib/config";
import { db } from "@/lib/db";
import { hashPasscode, normalizePhone } from "@/lib/security";
import { isAdmin } from "@/lib/session";
import { editSchema, toCents } from "@/lib/validation";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type Draft = {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  location: string;
  contact: string;
  whatsapp: string;
  phone: string;
};
export type ParseResult = { draft?: Draft; error?: string };
export type ImportState =
  | { ok?: boolean; id?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

function systemPrompt() {
  return `You turn one WhatsApp group post (someone selling an item, or offering housing or a sublease) into a draft listing for a website.

Reply with ONE JSON object only, no other text, with exactly these keys, all strings:
title, description, price, category, condition, location, contact, whatsapp, phone

Rules:
- title: a short, clear title (max 80 characters).
- description: the details from the post, lightly cleaned up (fix obvious typos, remove greetings and repeated emojis). Do not add facts that are not in the post.
- price: digits only, like 25 or 25.50. For housing, the monthly rent. Use "" if the post gives no price.
- category: exactly one of: ${[...SALE_CATEGORIES, ...HOUSING_CATEGORIES].join(", ")}. Use "Housing for rent" or "Sublease" for housing posts.
- condition: for items, exactly one of: ${CONDITIONS.join(", ")} (use "" if unclear). For housing, always "${RENTAL_CONDITION}".
- location: the town, neighborhood, or address area mentioned, or "".
- contact: how to reach the poster, as written in the post (for example "Text 814-555-0100"), or "".
- whatsapp and phone: the poster's phone number with country code if one appears in the post, otherwise "".
- Use "" for anything you cannot find. Never invent information.`;
}

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

/** Admin only: reads a pasted WhatsApp post and returns a draft listing. */
export async function parsePost(text: string): Promise<ParseResult> {
  if (!(await isAdmin())) redirect("/admin/login");

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { error: "ANTHROPIC_API_KEY isn't set in Vercel yet." };

  const post = text.trim().slice(0, 4000);
  if (post.length < 10) return { error: "Paste the full post first." };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system: systemPrompt(),
        messages: [{ role: "user", content: post }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      console.error("Import parse error:", res.status, await res.text());
      return { error: "Couldn't read that post. Try again in a moment." };
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const out = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    const start = out.indexOf("{");
    const end = out.lastIndexOf("}");
    if (start < 0 || end < start) return { error: "Couldn't read that post. You can fill the form in by hand." };
    const j = JSON.parse(out.slice(start, end + 1)) as Record<string, unknown>;

    const category = (CATEGORIES as readonly string[]).includes(str(j.category)) ? str(j.category) : "";
    const housing = (HOUSING_CATEGORIES as readonly string[]).includes(category);
    const cond = str(j.condition);
    const condition = housing
      ? RENTAL_CONDITION
      : (CONDITIONS as readonly string[]).includes(cond)
        ? cond
        : "";

    return {
      draft: {
        title: str(j.title).slice(0, 100),
        description: str(j.description).slice(0, 4000),
        price: str(j.price).replace(/[^\d.]/g, ""),
        category,
        condition,
        location: str(j.location).slice(0, 100),
        contact: str(j.contact).slice(0, 200),
        whatsapp: str(j.whatsapp),
        phone: str(j.phone),
      },
    };
  } catch (err) {
    console.error("Import parse failed:", err);
    return { error: "Couldn't read that post. You can fill the form in by hand." };
  }
}

/** Admin only: saves the reviewed draft as a real listing. */
export async function createImportedListing(_prev: ImportState, fd: FormData): Promise<ImportState> {
  if (!(await isAdmin())) redirect("/admin/login");

  // Phone is the poster's private edit number. If we don't have it, use a value nobody can type,
  // so only the admin controls the listing.
  const phoneRaw = String(fd.get("phone") ?? "").trim();
  let phone = `imp-${randomBytes(6).toString("hex")}`;
  if (phoneRaw) {
    const n = normalizePhone(phoneRaw);
    if (!n) return { error: "Please fix the highlighted fields.", fieldErrors: { phone: ["Enter a valid phone number, or leave it blank"] } };
    phone = n;
  }

  const raw = {
    ...Object.fromEntries(fd),
    images: fd.getAll("images").filter((x): x is string => typeof x === "string" && x !== ""),
    passcode: "",
    phone,
  };
  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const d = parsed.data;
  const listing = await db.listing.create({
    data: {
      title: d.title,
      description: d.description,
      priceCents: toCents(d.price),
      category: d.category,
      condition: d.condition,
      location: d.location,
      images: d.images,
      imageUrl: d.images[0] ?? null,
      contact: d.contact,
      whatsapp: normalizeWhatsapp(d.whatsapp) ?? null,
      phone,
      passcodeHash: hashPasscode(randomBytes(16).toString("hex")),
      status: fd.get("publish") === "on" ? "APPROVED" : "PENDING",
    },
  });

  revalidatePath("/");
  revalidatePath("/housing");
  revalidatePath("/admin");
  return { ok: true, id: listing.id };
}

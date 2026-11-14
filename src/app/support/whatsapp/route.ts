import { NextResponse } from "next/server";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Opens a WhatsApp chat with the site's support number (or username).
// SUPPORT_WHATSAPP stays a private server variable, so it never appears in the page's code.
export async function GET(request: Request) {
  const target = normalizeWhatsapp(process.env.SUPPORT_WHATSAPP ?? "");
  if (!target) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.redirect(`https://wa.me/${target}?text=${encodeURIComponent("Hi, I need help with the marketplace.")}`);
}

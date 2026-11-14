import { NextResponse } from "next/server";
import { SITE_NAME } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// The listing page links here instead of straight to WhatsApp, so the seller's
// number or username never appears in the page's HTML for scrapers to collect.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    select: { title: true, status: true, whatsapp: true },
  });

  if (!listing || listing.status !== "APPROVED" || !listing.whatsapp) {
    return NextResponse.redirect(new URL(`/listings/${id}`, request.url));
  }

  const text = `Hi, I'm interested in "${listing.title}" on ${SITE_NAME}.`;
  return NextResponse.redirect(`https://wa.me/${listing.whatsapp}?text=${encodeURIComponent(text)}`);
}

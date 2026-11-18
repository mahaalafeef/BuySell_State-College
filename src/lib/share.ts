import { SITE_NAME, formatListingPrice } from "@/lib/config";
import { siteUrl } from "@/lib/members";

type Shareable = { id: string; title: string; priceCents: number; category: string; location: string };

/**
 * The message people send to a WhatsApp group. It holds only what is already public (title, price, area, link),
 * never the seller's contact details, which stay for approved members on the site.
 */
export function listingShareText(l: Shareable): string {
  return `${l.title}\n${formatListingPrice(l.priceCents, l.category)} · ${l.location}\nPhotos and details on ${SITE_NAME}: ${siteUrl()}/listings/${l.id}`;
}

/** Opens WhatsApp with the message ready. The person then picks the group and presses send. Free, no account needed. */
export function whatsappShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

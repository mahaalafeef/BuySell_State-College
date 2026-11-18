import { formatListingPrice, SITE_NAME } from "./config";
import { maskContacts } from "./mask";
import { siteUrl } from "./members";

export type Shareable = {
  id: string;
  title: string;
  priceCents: number;
  category: string;
  location: string;
  description: string;
};

/** The message that appears in WhatsApp, ready to send. Contact details are never included. */
export function shareText(l: Shareable): string {
  const clean = maskContacts(l.description).replace(/\s+/g, " ").trim();
  const lines = [
    `🆕 *${maskContacts(l.title)}*`,
    `💲 ${formatListingPrice(l.priceCents, l.category)}`,
    l.location ? `📍 ${l.location}` : null,
    clean ? `\n${clean.slice(0, 140)}${clean.length > 140 ? "…" : ""}` : null,
    `\nSee it on ${SITE_NAME}: ${siteUrl()}/share/${l.id}`,
  ];
  return lines.filter((x): x is string => x !== null).join("\n");
}

/** Opens WhatsApp with the message typed. The person picks the group and taps send. */
export function whatsappShareUrl(l: Shareable): string {
  return `https://wa.me/?text=${encodeURIComponent(shareText(l))}`;
}

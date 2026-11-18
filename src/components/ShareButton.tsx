import { listingShareText, whatsappShareHref } from "@/lib/share";

/** "Share on WhatsApp": opens WhatsApp with the listing ready to send to a group or a friend. */
export function ShareButton({
  listing,
  label = "Share on WhatsApp",
  className = "btn-ghost",
}: {
  listing: { id: string; title: string; priceCents: number; category: string; location: string };
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={whatsappShareHref(listingShareText(listing))}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {label}
      <span className="sr-only"> (opens WhatsApp)</span>
    </a>
  );
}

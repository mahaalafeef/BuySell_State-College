import { whatsappShareUrl, type Shareable } from "@/lib/whatsappShare";

export function ShareToWhatsApp({
  listing,
  className = "btn-primary",
  children = "Share to WhatsApp",
}: {
  listing: Shareable;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a href={whatsappShareUrl(listing)} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

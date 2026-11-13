import Link from "next/link";
import { formatPrice } from "@/lib/config";

type Props = {
  id: string;
  title: string;
  priceCents: number;
  location: string;
  condition: string;
  imageUrl: string | null;
};

export function ListingCard({ id, title, priceCents, location, condition, imageUrl }: Props) {
  return (
    <Link
      href={`/listings/${id}`}
      className="block overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-line/60">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-muted">No photo</div>
        )}
        <span className="absolute bottom-3 left-3 rounded-sm bg-tag px-2.5 py-1 font-display text-lg font-bold text-ink">
          {formatPrice(priceCents)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-lg font-semibold">{title}</h3>
        <div className="mt-1 flex items-center justify-between gap-2 text-sm text-muted">
          <span className="truncate">{location}</span>
          <span className="shrink-0">{condition}</span>
        </div>
      </div>
    </Link>
  );
}

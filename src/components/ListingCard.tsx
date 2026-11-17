import Link from "next/link";
import { FramedImage } from "./FramedImage";
import { formatListingId, formatListingPrice, formatPosted, HOUSING_CATEGORIES } from "@/lib/config";

type Props = {
  id: string;
  listingNumber: number;
  createdAt: Date;
  title: string;
  priceCents: number;
  category: string;
  location: string;
  condition: string;
  imageUrl: string | null;
  status?: string;
};

export function ListingCard({ id, listingNumber, createdAt, title, priceCents, category, location, condition, imageUrl, status }: Props) {
  const rental = (HOUSING_CATEGORIES as readonly string[]).includes(category);
  return (
    <Link
      href={`/listings/${id}`}
      className="group block overflow-hidden rounded-xl border border-line bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-line/60">
        {imageUrl ? (
          <FramedImage src={imageUrl} alt="" />
        ) : (
          <div className="grid h-full place-items-center text-muted">No photo</div>
        )}
        {status === "SALE_PENDING" && (
          <span className="absolute left-3 top-3 rounded-md bg-blue-100 px-2.5 py-1 text-sm font-semibold text-blue-900 shadow">
            Pending
          </span>
        )}
        <span className="absolute bottom-3 left-3 -rotate-2 rounded-md sticker px-3 py-1 font-display text-lg font-bold shadow">
          {formatListingPrice(priceCents, category)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-lg font-semibold group-hover:text-brand">{title}</h3>
        <div className="mt-1 flex items-center justify-between gap-2 text-sm text-muted">
          <span className="truncate">{location}</span>
          <span className="shrink-0 rounded-full bg-paper px-2 py-0.5">{rental ? category : condition}</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          {formatListingId(listingNumber)} · Posted {formatPosted(createdAt)}
        </p>
      </div>
    </Link>
  );
}

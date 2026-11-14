import Link from "next/link";
import { formatListingPrice, HOUSING_CATEGORIES } from "@/lib/config";

type Props = {
  id: string;
  title: string;
  priceCents: number;
  category: string;
  location: string;
  condition: string;
  imageUrl: string | null;
};

export function ListingCard({ id, title, priceCents, category, location, condition, imageUrl }: Props) {
  const rental = (HOUSING_CATEGORIES as readonly string[]).includes(category);
  return (
    <Link
      href={`/listings/${id}`}
      className="group block overflow-hidden rounded-xl border border-line bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-line/60">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted">No photo</div>
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
      </div>
    </Link>
  );
}

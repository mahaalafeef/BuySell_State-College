import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteOwnedListing, setAvailability } from "@/app/account-actions";
import { ClaimForm } from "@/components/ClaimForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { Stars } from "@/components/Stars";
import { StatusBadge } from "@/components/StatusBadge";
import { currentMemberId } from "@/lib/accountAuth";
import { formatListingPrice } from "@/lib/config";
import { db } from "@/lib/db";
import { publicName, sellerStats } from "@/lib/seller";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

const OPTIONS = [
  ["AVAILABLE", "Available"],
  ["PENDING_SALE", "Sale pending"],
  ["SOLD", "Sold"],
] as const;

export default async function AccountPage() {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/members");

  const [me, listings, stats] = await Promise.all([
    db.joinRequest.findUnique({ where: { id: memberId }, select: { name: true } }),
    db.listing.findMany({ where: { ownerId: memberId }, orderBy: { createdAt: "desc" } }),
    sellerStats([memberId]),
  ]);
  const stat = stats.get(memberId);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My account</h1>
          <p className="mt-1 text-muted">
            {me ? publicName(me.name) : "Member"}
            {stat && stat.count > 0 ? (
              <>
                {" "}
                <Stars value={stat.average} /> {stat.average.toFixed(1)} ({stat.count}{" "}
                {stat.count === 1 ? "review" : "reviews"})
              </>
            ) : (
              " · No reviews yet"
            )}
          </p>
          <Link href={`/seller/${memberId}`} className="text-sm font-semibold text-brand underline">
            See my public profile
          </Link>
        </div>
        <Link href="/sell" className="btn-primary">
          Post a listing
        </Link>
      </div>

      <section aria-label="My listings" className="space-y-4">
        <h2 className="text-2xl font-bold">My listings ({listings.length})</h2>

        {listings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
            You haven&rsquo;t posted anything yet. Listings you post will appear here.
          </p>
        ) : (
          <ul className="space-y-4">
            {listings.map((l) => {
              const availability = l.status === "SOLD" ? "SOLD" : l.availability;
              const photo = l.images[0] ?? l.imageUrl;
              return (
                <li key={l.id} className="space-y-3 rounded-xl border border-line bg-white p-4">
                  <div className="flex gap-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-paper">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-muted">No photo</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold">{l.title}</p>
                      <p className="text-sm text-muted">{formatListingPrice(l.priceCents, l.category)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {l.status === "PENDING" && <StatusBadge status="PENDING" />}
                        {l.status === "REJECTED" && <StatusBadge status="REJECTED" />}
                        {l.status === "REJECTED" && l.rejectionReason && (
                          <span className="text-sm text-danger">Reason: {l.rejectionReason}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div role="group" aria-label={`Status of ${l.title}`} className="flex flex-wrap gap-2">
                    {OPTIONS.map(([value, label]) => (
                      <form key={value} action={setAvailability.bind(null, l.id, value)}>
                        <button
                          aria-pressed={availability === value}
                          disabled={availability === value}
                          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                            availability === value
                              ? "border-brand bg-brand text-white"
                              : "border-line bg-white hover:border-brand hover:text-brand"
                          }`}
                        >
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/account/listings/${l.id}`} className="btn-ghost">
                      Edit
                    </Link>
                    <Link href={`/listings/${l.id}`} className="btn-ghost">
                      View
                    </Link>
                    <form action={deleteOwnedListing.bind(null, l.id)}>
                      <ConfirmButton message={`Delete "${l.title}"? This can't be undone.`}>Delete</ConfirmButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Change password" className="space-y-3 rounded-xl border border-line bg-white p-5">
        <h2 className="text-xl font-bold">Change password</h2>
        <NewPasswordForm mode="change" />
      </section>

      <section aria-label="Add an older listing" className="space-y-3 rounded-xl border border-line bg-white p-5">
        <h2 className="text-xl font-bold">Have an older listing?</h2>
        <p className="text-sm text-muted">
          Listings you posted before accounts existed can be added here. Enter the listing ID with its passcode or the
          phone number you used.
        </p>
        <ClaimForm />
      </section>
    </div>
  );
}

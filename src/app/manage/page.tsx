import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { AccessForm } from "@/components/AccessForm";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice } from "@/lib/config";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/session";

export const metadata: Metadata = { title: "My listings" };
export const dynamic = "force-dynamic";

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const session = await getUserSession();
  const signedIn = session.ids.length > 0 || !!session.phone;

  const mine = signedIn
    ? await db.listing.findMany({
        where: {
          OR: [
            ...(session.phone ? [{ phone: session.phone }] : []),
            ...(session.ids.length ? [{ id: { in: session.ids } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold">My listings</h1>

      {mine.length > 0 && (
        <section aria-label="Your listings" className="space-y-3">
          {mine.map((l) => (
            <Link
              key={l.id}
              href={`/manage/${l.id}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-line bg-white p-4 hover:bg-paper"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{l.title}</p>
                <p className="text-sm text-muted">{formatPrice(l.priceCents)}</p>
              </div>
              <StatusBadge status={l.status} />
            </Link>
          ))}
          <form action={signOut}>
            <button className="text-sm underline">Sign out of this device</button>
          </form>
        </section>
      )}

      <section aria-label="Find a listing" className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-1 text-xl font-semibold">{mine.length ? "Open another listing" : "Edit a listing"}</h2>
        <p className="mb-4 text-sm text-muted">Use your passcode or the phone number you listed with.</p>
        <AccessForm defaultId={id} />
      </section>
    </div>
  );
}

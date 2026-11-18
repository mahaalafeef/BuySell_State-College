import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { ShareToWhatsApp } from "@/components/ShareToWhatsApp";
import { formatListingPrice } from "@/lib/config";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { shareText } from "@/lib/share";

export const metadata: Metadata = { title: "Share to WhatsApp" };
export const dynamic = "force-dynamic";

const isSold = (l: object) => (l as { availability?: string }).availability === "SOLD";

export default async function ShareInbox() {
  if (!(await isAdmin())) redirect("/admin/login");

  const rows = (
    await db.listing.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 60,
    })
  )
    .filter((l) => !isSold(l))
    .slice(0, 30);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Share to WhatsApp</h1>
        <Link href="/admin" className="btn-ghost">
          Back to listings
        </Link>
      </div>
      <p className="text-muted">
        Your newest live listings. Tap <strong>Share to WhatsApp</strong>, pick your group, and send. The message
        includes a photo preview and never includes contact details.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
          No live listings yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((l) => {
            const photo = l.images[0] ?? l.imageUrl;
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-paper">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{l.title}</p>
                  <p className="text-sm text-muted">
                    {formatListingPrice(l.priceCents, l.category)}, posted{" "}
                    {l.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ShareToWhatsApp listing={l} />
                  <CopyButton text={shareText(l)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

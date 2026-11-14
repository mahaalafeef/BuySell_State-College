import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  adminDeleteListing,
  adminLogout,
  approveAllPending,
  approveListing,
  rejectListing,
  setApprovalMode,
} from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice } from "@/lib/config";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";
import { getAutoApprove } from "@/lib/settings";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const TABS = ["PENDING", "APPROVED", "REJECTED", "SOLD"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  PENDING: "To review",
  APPROVED: "Live",
  REJECTED: "Not approved",
  SOLD: "Sold",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { status } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(status ?? "") ? (status as Tab) : "PENDING";

  const [auto, listings, counts, openSupport] = await Promise.all([
    getAutoApprove(),
    db.listing.findMany({ where: { status: tab }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.listing.groupBy({ by: ["status"], _count: { _all: true } }),
    db.supportRequest.count({ where: { status: "OPEN" } }),
  ]);
  const countOf = (s: Tab) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Admin</h1>
        <div className="flex gap-2">
          <Link href="/admin/support" className="btn-ghost">
            Customer messages{openSupport > 0 ? ` (${openSupport} new)` : ""}
          </Link>
          <form action={adminLogout}>
            <button className="btn-ghost">Sign out</button>
          </form>
        </div>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-white p-4">
        <div>
          <p className="font-semibold">Approval mode: {auto ? "Automatic" : "Manual"}</p>
          <p className="text-sm text-muted">
            {auto
              ? "New listings and edits go live right away."
              : "New listings and edits wait here until you approve them."}
          </p>
        </div>
        <div className="flex gap-2">
          {countOf("PENDING") > 0 && (
            <form action={approveAllPending}>
              <button className="btn-ghost">Approve all {countOf("PENDING")} waiting</button>
            </form>
          )}
          <form action={setApprovalMode.bind(null, !auto)}>
            <button className="btn-primary">{auto ? "Switch to manual" : "Switch to automatic"}</button>
          </form>
        </div>
      </section>

      <nav aria-label="Listing status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin?status=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${
              t === tab ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-paper"
            }`}
          >
            {TAB_LABELS[t]} ({countOf(t)})
          </Link>
        ))}
      </nav>

      {listings.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-muted">
          Nothing in this list.
        </p>
      ) : (
        <ul className="space-y-4">
          {listings.map((l) => (
            <li key={l.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/listings/${l.id}`} className="text-lg font-semibold underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatPrice(l.priceCents)}, {l.category}, {l.location}
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </div>

              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm">{l.description}</p>
              <p className="mt-2 text-sm text-muted">
                Public contact: {l.contact}. Seller phone: {l.phone}.
              </p>
              {l.rejectionReason && <p className="mt-1 text-sm text-danger">Reason given: {l.rejectionReason}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {l.status !== "APPROVED" && (
                  <form action={approveListing.bind(null, l.id)}>
                    <button className="btn-primary">Approve</button>
                  </form>
                )}
                {l.status !== "REJECTED" && (
                  <form action={rejectListing.bind(null, l.id)} className="flex gap-2">
                    <input
                      name="reason"
                      placeholder="Reason (optional)"
                      aria-label={`Reason for rejecting ${l.title}`}
                      className="input w-48"
                    />
                    <button className="btn-ghost">Reject</button>
                  </form>
                )}
                <form action={adminDeleteListing.bind(null, l.id)}>
                  <button className="btn-danger">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

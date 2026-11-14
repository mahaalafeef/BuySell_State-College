import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteSupport, resolveSupport } from "@/app/support-actions";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Customer messages" };
export const dynamic = "force-dynamic";

export default async function SupportInbox() {
  if (!(await isAdmin())) redirect("/admin/login");

  const requests = await db.supportRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }], // open first
    take: 100,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Customer messages</h1>
        <Link href="/admin" className="btn-ghost">
          Back to listings
        </Link>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
          No messages yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{r.name}</p>
                  <p className="text-sm text-muted">
                    {r.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                    r.status === "OPEN" ? "bg-amber-100 text-amber-900" : "bg-line text-muted"
                  }`}
                >
                  {r.status === "OPEN" ? "Needs reply" : "Resolved"}
                </span>
              </div>

              <p className="mt-2 break-words">
                <span className="font-semibold">Reply to:</span> {r.contact}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{r.message}</p>

              {r.transcript && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold">Earlier chat with the assistant</summary>
                  <p className="mt-2 whitespace-pre-wrap rounded-md bg-paper p-3">{r.transcript}</p>
                </details>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "OPEN" && (
                  <form action={resolveSupport.bind(null, r.id)}>
                    <button className="btn-primary">Mark resolved</button>
                  </form>
                )}
                <form action={deleteSupport.bind(null, r.id)}>
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

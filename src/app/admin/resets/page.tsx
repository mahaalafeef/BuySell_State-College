import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dismissReset } from "@/app/password-actions";
import { SITE_NAME } from "@/lib/config";
import { db } from "@/lib/db";
import { resetLink } from "@/lib/passwordReset";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Password resets" };
export const dynamic = "force-dynamic";

export default async function ResetsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const rows = await db.joinRequest.findMany({
    where: { status: "APPROVED", resetRequestedAt: { not: null } },
    orderBy: { resetRequestedAt: "asc" },
    select: { id: true, name: true, whatsapp: true, resetRequestedAt: true, passwordHash: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Password resets</h1>
        <Link href="/admin/join" className="btn-ghost">
          Back to join requests
        </Link>
      </div>
      <p className="text-muted">
        Members who said they forgot their password. Check it&rsquo;s really them in the chat, send the link, then tap
        Done. A link works once and expires after 24 hours.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
          No reset requests.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const shown = /^\d+$/.test(r.whatsapp) ? `+${r.whatsapp}` : `@${r.whatsapp}`;
            const text = `Hi ${r.name.split(" ")[0]}! Here is your link to choose a new ${SITE_NAME} password (it works once and expires in 24 hours, please don't share it): ${resetLink(r.id, r.passwordHash)}`;
            return (
              <li key={r.id} className="space-y-3 rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{r.name}</p>
                    <p className="text-sm text-muted">
                      {shown}. Asked {r.resetRequestedAt?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/${r.whatsapp}?text=${encodeURIComponent(text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    Send reset link on WhatsApp
                  </a>
                  <form action={dismissReset.bind(null, r.id)}>
                    <button className="btn-ghost">Done</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

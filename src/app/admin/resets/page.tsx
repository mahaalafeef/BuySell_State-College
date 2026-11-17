import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dismissReset, resetMemberPassword } from "@/app/join-actions";
import { SITE_NAME, formatPosted } from "@/lib/config";
import { db } from "@/lib/db";
import { memberLink } from "@/lib/members";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Password resets" };
export const dynamic = "force-dynamic";

function show(whatsapp: string) {
  return /^\d+$/.test(whatsapp) ? `+${whatsapp}` : `@${whatsapp}`;
}

const chat = (whatsapp: string, text: string) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;

export default async function ResetsAdmin() {
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
        <div className="flex gap-2">
          <Link href="/admin/join?status=APPROVED" className="btn-ghost">
            Members
          </Link>
          <Link href="/admin" className="btn-ghost">
            Back to listings
          </Link>
        </div>
      </div>

      <ol className="list-decimal space-y-1 rounded-lg border border-line bg-white p-4 pl-8 text-sm">
        <li>Message the person on WhatsApp to check it is really them.</li>
        <li>Press &ldquo;Reset password&rdquo;. Their old password stops working.</li>
        <li>Press &ldquo;Send reset link on WhatsApp&rdquo; so they can choose a new one.</li>
      </ol>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
          No password reset requests.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-white p-4">
              <p className="text-lg font-semibold">{r.name}</p>
              <p className="text-sm text-muted">
                {show(r.whatsapp)} · asked {r.resetRequestedAt ? formatPosted(r.resetRequestedAt, true) : ""}
              </p>
              <p className="mt-1 text-sm text-muted">
                {r.passwordHash ? "Still has their old password." : "Password already cleared: they can choose a new one."}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={chat(
                    r.whatsapp,
                    `Hi ${r.name}! We got a request to reset your password for ${SITE_NAME}. Was that you? If so, reply here and I will send you a link.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  1. Check with them on WhatsApp
                </a>
                <form action={resetMemberPassword.bind(null, r.id)}>
                  <button className="btn-ghost">2. Reset password</button>
                </form>
                <a
                  href={chat(
                    r.whatsapp,
                    `Hi ${r.name}! Here is your link to choose a new password for ${SITE_NAME} (please do not share it): ${memberLink(r.id)}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  3. Send reset link on WhatsApp
                </a>
                <form action={dismissReset.bind(null, r.id)}>
                  <button className="btn-ghost">Dismiss</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

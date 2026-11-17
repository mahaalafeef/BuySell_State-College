import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { db } from "@/lib/db";
import { readResetToken, resetMatches } from "@/lib/passwordReset";

export const metadata: Metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const token = readResetToken(t);
  const row = token
    ? await db.joinRequest.findUnique({ where: { id: token.id }, select: { name: true, status: true, passwordHash: true } })
    : null;
  const valid = !!token && !!row && row.status === "APPROVED" && resetMatches(token.h, row.passwordHash);

  if (!valid || !t) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-3xl font-bold">This link doesn&rsquo;t work</h1>
        <p className="text-muted">It may have expired (links last 24 hours) or already been used.</p>
        <Link href="/members/forgot" className="btn-primary">
          Ask for a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        <p className="mt-2 text-muted">Hi {row?.name.split(" ")[0]}! Pick a new password to get back in.</p>
      </div>
      <NewPasswordForm mode="reset" token={t} />
    </div>
  );
}

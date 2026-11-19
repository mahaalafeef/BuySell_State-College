import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { db } from "@/lib/db";
import { fingerprintMatches, readResetToken } from "@/lib/members";

export const metadata: Metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const data = readResetToken(t);
  const row = data
    ? await db.joinRequest.findUnique({ where: { id: data.id }, select: { status: true, passwordHash: true, name: true } })
    : null;

  if (!t || !data || !row || row.status !== "APPROVED" || !fingerprintMatches(row.passwordHash, data.fingerprint)) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-3xl font-bold">This link has expired</h1>
        <p>
          Reset links work once and expire after an hour. Please ask for a new one with &ldquo;Forgot your password?&rdquo;
          on the log in page.
        </p>
        <Link href="/login" className="btn-primary">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Choose a new password, {row.name}</h1>
        <p className="mt-2 text-muted">You will be logged in as soon as you save it.</p>
      </div>
      <NewPasswordForm t={t} />
    </div>
  );
}

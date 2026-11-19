import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/SetupForm";
import { SITE_NAME } from "@/lib/config";
import { db } from "@/lib/db";
import { codeMatches } from "@/lib/members";

export const metadata: Metadata = { title: "Choose your password" };
export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ m?: string; c?: string }> }) {
  const { m, c } = await searchParams;
  if (!m || !c || !codeMatches(m, c)) redirect("/members?invalid=1");

  const row = await db.joinRequest.findUnique({ where: { id: m }, select: { status: true, passwordHash: true, name: true } });
  if (row?.status !== "APPROVED") redirect("/members?invalid=1");
  if (row.passwordHash) redirect("/login?link=1"); // a password is already set: log in with it

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {row.name}!</h1>
        <p className="mt-2 text-muted">
          Choose a password for {SITE_NAME}. Next time, log in with this password.
        </p>
      </div>
      <SetupForm m={m} c={c} />
    </div>
  );
}

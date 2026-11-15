import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ImportTool } from "@/components/ImportTool";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Import from WhatsApp" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Import from WhatsApp</h1>
        <Link href="/admin" className="btn-ghost">
          Back to listings
        </Link>
      </div>
      <p className="rounded-xl bg-amber-100 p-4 text-amber-900">
        Only import posts when the person who wrote them is happy to have them on the website, because listings are
        public. Save the photos from WhatsApp to your phone first, then add them in step 2.
      </p>
      <ImportTool />
    </div>
  );
}

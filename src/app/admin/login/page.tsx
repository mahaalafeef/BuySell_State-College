import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin sign in" };
export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto max-w-sm space-y-5">
      <h1 className="text-3xl font-bold">Admin sign in</h1>
      <AdminLoginForm />
    </div>
  );
}

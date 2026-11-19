import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/SignupForm";
import { SITE_NAME } from "@/lib/config";
import { hasMemberAccess } from "@/lib/memberAccess";

export const metadata: Metadata = { title: "Create an account" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await hasMemberAccess()) redirect("/"); // already signed in

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-muted">
          Sign up with your email and a password to see seller contact details and post on {SITE_NAME}. It&rsquo;s free and
          you&rsquo;re signed in right away.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/ForgotForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Forgot your password?</h1>
        <p className="mt-2 text-muted">
          Enter the WhatsApp number you joined with. We&rsquo;ll message you a link to choose a new one.
        </p>
      </div>
      <ForgotForm />
      <p className="text-sm text-muted">
        Still have the personal link we sent you? Open it to sign in, then change your password in{" "}
        <Link href="/account" className="font-semibold text-brand underline">
          My account
        </Link>
        . Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand underline">
          Log in
        </Link>
        .
      </p>
    </div>
  );
}

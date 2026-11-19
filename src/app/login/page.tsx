import type { Metadata } from "next";
import { ForgotPassword } from "@/components/ForgotPassword";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { link } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-bold">Member log in</h1>
      {link && (
        <p role="status" className="rounded-md bg-paper p-3 text-sm">
          Your password is already set. For your security, your personal link only works for choosing a password, so
          please log in with your email or WhatsApp number and your password.
        </p>
      )}
      <LoginForm />
      <ForgotPassword />
    </div>
  );
}

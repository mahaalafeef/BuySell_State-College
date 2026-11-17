import type { Metadata } from "next";
import { ForgotPassword } from "@/components/ForgotPassword";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-bold">Member log in</h1>
      <LoginForm />
      <ForgotPassword />
    </div>
  );
}

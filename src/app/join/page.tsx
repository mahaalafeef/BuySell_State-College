import type { Metadata } from "next";
import { JoinForm } from "@/components/JoinForm";

export const metadata: Metadata = { title: "Join the group" };

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Join our WhatsApp group</h1>
        <p className="mt-2 text-muted">
          This group is for people connected to Penn State or living in State College. Send a request and we&rsquo;ll
          check it and message you on WhatsApp with your invite.
        </p>
      </div>
      <JoinForm />
    </div>
  );
}

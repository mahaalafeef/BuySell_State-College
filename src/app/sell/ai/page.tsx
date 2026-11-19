import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AiListingMaker } from "@/components/AiListingMaker";
import { hasMemberAccess } from "@/lib/memberAccess";

export const metadata: Metadata = { title: "Quick post with AI" };
export const maxDuration = 60; // the AI can take a few seconds to write

export default async function QuickPostPage() {
  // Only approved members (checked live) can post
  if (!(await hasMemberAccess())) redirect("/members");
  return (
    <div className="mx-auto max-w-2xl">
      <AiListingMaker />
    </div>
  );
}

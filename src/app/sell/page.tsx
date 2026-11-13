import type { Metadata } from "next";
import { createListing } from "@/app/actions";
import { ListingForm } from "@/components/ListingForm";

export const metadata: Metadata = { title: "Sell an item" };

export default function SellPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Sell an item</h1>
      <ListingForm mode="create" action={createListing} />
    </div>
  );
}

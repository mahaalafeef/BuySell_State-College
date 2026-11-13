import type { Metadata } from "next";
import Link from "next/link";
import { createListing } from "@/app/actions";
import { ListingForm } from "@/components/ListingForm";

export const metadata: Metadata = { title: "Post a listing" };

export default async function SellPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;

  if (type !== "item" && type !== "housing") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">What are you posting?</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/sell?type=item"
            className="block rounded-lg border border-line bg-white p-6 transition-shadow hover:shadow-md"
          >
            <span className="font-display text-xl font-bold">An item for sale</span>
            <span className="mt-1 block text-muted">Furniture, electronics, clothes, books, and more.</span>
          </Link>
          <Link
            href="/sell?type=housing"
            className="block rounded-lg border border-line bg-white p-6 transition-shadow hover:shadow-md"
          >
            <span className="font-display text-xl font-bold">Housing or a sublease</span>
            <span className="mt-1 block text-muted">A room, apartment, or sublease for rent.</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{type === "housing" ? "List housing or a sublease" : "Sell an item"}</h1>
        <Link href="/sell" className="text-sm underline">
          Change type
        </Link>
      </div>
      <ListingForm mode="create" kind={type} action={createListing} />
    </div>
  );
}

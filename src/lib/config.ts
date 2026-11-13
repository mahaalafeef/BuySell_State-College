// Edit this file to change categories, conditions, and limits.

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Marketplace";
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

// Things for sale (shown on the home page)
export const SALE_CATEGORIES = [
  "Electronics",
  "Furniture",
  "Clothing",
  "Vehicles",
  "Home & garden",
  "Sports & outdoors",
  "Toys & games",
  "Books & media",
  "Other",
] as const;

// Rentals (shown on the Housing page, priced per month)
export const HOUSING_CATEGORIES = ["Housing for rent", "Sublease"] as const;

export const CATEGORIES = [...SALE_CATEGORIES, ...HOUSING_CATEGORIES] as const;

// Housing listings have no item condition; this value is stored instead
export const RENTAL_CONDITION = "Rental";

export const CONDITIONS = ["New", "Like new", "Good", "Fair", "For parts"] as const;

// Lock a listing after this many wrong passcode/phone attempts
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

// How long a seller stays signed in after proving ownership
export const USER_SESSION_MINUTES = 60;
export const ADMIN_SESSION_HOURS = 8;

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY }).format(cents / 100);
}

/** Adds "/month" for housing and sublease listings. */
export function formatListingPrice(cents: number, category: string) {
  const base = formatPrice(cents);
  return (HOUSING_CATEGORIES as readonly string[]).includes(category) ? `${base}/month` : base;
}

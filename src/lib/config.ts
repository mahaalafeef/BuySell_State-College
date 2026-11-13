// Edit this file to change categories, conditions, and limits.

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Marketplace";
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

export const CATEGORIES = [
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

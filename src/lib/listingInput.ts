import { z } from "zod";
import { CATEGORIES, CONDITIONS, RENTAL_CONDITION } from "./config";
import { normalizeWhatsapp } from "./whatsapp";

// The rules for a listing edited from "My account". It is kept separate from the posting form's rules,
// so changing one doesn't break the other.
export const listingInput = z.object({
  title: z.string().trim().min(3, "Enter at least 3 characters").max(100, "Keep it under 100 characters"),
  description: z.string().trim().min(10, "Describe the item in at least 10 characters").max(4000),
  price: z.string().trim().regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter a price like 25 or 25.50"),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Choose a category" }) }),
  condition: z
    .string()
    .refine((v) => (CONDITIONS as readonly string[]).includes(v) || v === RENTAL_CONDITION, "Choose a condition"),
  location: z.string().trim().min(2, "Enter a town or neighborhood").max(100),
  contact: z.string().trim().min(3, "Tell buyers how to reach you").max(200),
  whatsapp: z
    .string()
    .trim()
    .max(60)
    .default("")
    .refine(
      (v) => normalizeWhatsapp(v) !== undefined,
      "Use a number with country code (+1 555 123 4567) or a WhatsApp username",
    ),
  images: z
    .array(z.string().url().refine((u) => u.startsWith("https://"), "Photo links must be https"))
    .max(5, "You can add up to 5 photos"),
  // Both optional here: leave blank to keep what the listing already has
  phone: z.string().trim().max(40).default(""),
  passcode: z
    .string()
    .max(64)
    .default("")
    .refine((v) => v === "" || v.length >= 6, "Use at least 6 characters"),
});

export function toCents(price: string): number {
  return Math.round(parseFloat(price) * 100);
}

import { z } from "zod";
import { CATEGORIES, CONDITIONS, RENTAL_CONDITION } from "./config";
import { normalizeWhatsapp } from "./whatsapp";

const base = z.object({
  title: z.string().trim().min(3, "Enter at least 3 characters").max(100, "Keep it under 100 characters"),
  description: z.string().trim().min(10, "Describe the item in at least 10 characters").max(4000),
  price: z.string().trim().regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter a price like 25 or 25.50"),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Choose a category" }) }),
  condition: z.string().refine(
    (v) => (CONDITIONS as readonly string[]).includes(v) || v === RENTAL_CONDITION,
    "Choose a condition",
  ),
  location: z.string().trim().min(2, "Enter a town or neighborhood").max(100),
  images: z
    .array(z.string().url().refine((u) => u.startsWith("https://"), "Photo links must be https"))
    .max(5, "You can add up to 5 photos"),
  contact: z.string().trim().min(3, "Tell buyers how to reach you").max(200),
  whatsapp: z
    .string()
    .trim()
    .max(60)
    .refine(
      (v) => normalizeWhatsapp(v) !== undefined,
      "Use a number with country code (+1 555 123 4567) or a WhatsApp username",
    ),
  phone: z.string().trim().min(1, "Enter your phone number"),
});

export const createSchema = base.extend({
  passcode: z.string().min(6, "Use at least 6 characters").max(64),
});

export const editSchema = base.extend({
  // Optional: leave blank to keep the current passcode
  passcode: z
    .string()
    .max(64)
    .refine((v) => v === "" || v.length >= 6, "Use at least 6 characters"),
});

export function toCents(price: string): number {
  return Math.round(parseFloat(price) * 100);
}

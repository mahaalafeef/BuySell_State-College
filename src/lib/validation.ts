import { z } from "zod";
import { CATEGORIES, CONDITIONS } from "./config";

const base = z.object({
  title: z.string().trim().min(3, "Enter at least 3 characters").max(100, "Keep it under 100 characters"),
  description: z.string().trim().min(10, "Describe the item in at least 10 characters").max(4000),
  price: z.string().trim().regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter a price like 25 or 25.50"),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Choose a category" }) }),
  condition: z.enum(CONDITIONS, { errorMap: () => ({ message: "Choose a condition" }) }),
  location: z.string().trim().min(2, "Enter a town or neighborhood").max(100),
  imageUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Enter a full link starting with https://"),
  contact: z.string().trim().min(3, "Tell buyers how to reach you").max(200),
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

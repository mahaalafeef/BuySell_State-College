// Used for the "Message on WhatsApp" button.
// Stores either a number (digits only, with country code) or a WhatsApp username.

const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || "1"; // 1 = USA/Canada

/**
 * Returns the cleaned value, null if left blank, or undefined if it isn't valid.
 */
export function normalizeWhatsapp(raw: string): string | null | undefined {
  const v = raw.trim();
  if (!v) return null;

  // A username contains letters (letters, digits, dots, underscores; 3-35 characters)
  if (/[a-z]/i.test(v)) {
    const name = v.replace(/^@/, "").toLowerCase();
    return /^[a-z0-9._]{3,35}$/.test(name) ? name : undefined;
  }

  // Otherwise it's a phone number
  let digits = v.replace(/\D/g, "");
  if (!v.startsWith("+") && v.startsWith("00")) digits = digits.slice(2);
  else if (!v.startsWith("+") && digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;

  if (digits.startsWith("0")) return undefined; // needs the country code, not a local number
  return digits.length >= 8 && digits.length <= 15 ? digits : undefined;
}

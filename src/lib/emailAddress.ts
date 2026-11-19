/**
 * Turns what someone typed into one standard Gmail address, or null if it is not a Gmail address.
 * Gmail ignores dots and anything after a plus sign, so "Jo.Smith+shop@gmail.com" and "josmith@googlemail.com"
 * are the same inbox. Storing one standard form means one person cannot make several accounts with one inbox.
 */
export function canonicalGmail(raw: string): string | null {
  const m = raw
    .trim()
    .toLowerCase()
    .match(/^([a-z0-9.]+)(?:\+[^@\s]*)?@(?:gmail|googlemail)\.com$/);
  if (!m) return null;
  const local = m[1].replace(/\./g, "");
  return local.length >= 3 ? `${local}@gmail.com` : null;
}

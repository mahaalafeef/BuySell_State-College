// Places people mention when they sell around State College, so "near campus" or "beaver ave" becomes a proper location.
// Add your own: the first matching line wins, so put more specific places above general ones.

const PLACES: [RegExp, string][] = [
  [/\b(?:penn state|psu|university park)(?:\s+campus)?\b/i, "Penn State campus, State College"],
  [/\bbeaver\s+(?:ave(?:nue)?|canyon)\b/i, "Beaver Ave, State College"],
  [/\bcollege\s+ave(?:nue)?\b/i, "College Ave, State College"],
  [/\bcalder\s+way\b/i, "Calder Way, State College"],
  [/\batherton(?:\s+st(?:reet)?)?\b/i, "Atherton St, State College"],
  [/\bpark\s+forest\b/i, "Park Forest, State College"],
  [/\btoftrees\b/i, "Toftrees, State College"],
  [/\bboalsburg\b/i, "Boalsburg"],
  [/\bbellefonte\b/i, "Bellefonte"],
  [/\blemont\b/i, "Lemont"],
  [/\bpine\s+grove\s+mills\b/i, "Pine Grove Mills"],
  [/\bport\s+matilda\b/i, "Port Matilda"],
  [/\bcentre\s+hall\b/i, "Centre Hall"],
  [/\bhouserville\b/i, "Houserville"],
  [/\bcampus\b/i, "Near campus, State College"],
  [/\bdowntown\b/i, "Downtown State College"],
  [/\bstate\s+college\b/i, "State College"],
];

/** Names handed to the AI as hints about the area. */
export const KNOWN_AREAS = [
  "Penn State campus / University Park",
  "Downtown State College",
  "Beaver Ave",
  "College Ave",
  "Calder Way",
  "Atherton St",
  "Park Forest",
  "Toftrees",
  "Boalsburg",
  "Bellefonte",
  "Lemont",
  "Pine Grove Mills",
  "Port Matilda",
  "Centre Hall",
  "Houserville",
];

const NOT_PLACES = new Set(["good", "great", "excellent", "new", "like", "fair", "perfect", "working", "condition", "used", "very", "mint", "clean"]);

/** Finds a pickup location in what the person wrote, or "" if there is none. */
export function findLocation(text: string): string {
  for (const [re, place] of PLACES) if (re.test(text)) return place;

  // Otherwise, a capitalized place after "near", "at", "in", "by" or "around" (e.g. "pick up near Weis Market")
  const m = text.match(/\b(?:near|at|in|around|by|off)\s+((?:[A-Z][\w'&.-]*)(?:\s+[A-Z][\w'&.-]*){0,3})/);
  if (m && !NOT_PLACES.has(m[1].split(/\s+/)[0].toLowerCase())) return m[1].trim().slice(0, 60);
  return "";
}

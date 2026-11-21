// Places people mention when they sell around State College, so "near campus", "beaver ave" or "pattee library" becomes a
// proper location. Add your own: the first matching line wins, so put more specific places above general ones.
// This file has no server code, so the listing form can also use it in the browser to fill in the location as people type.

const cap = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

type Place = [RegExp, string | ((m: RegExpMatchArray) => string)];

const PLACES: Place[] = [
  // Penn State landmarks
  [/\bhub[\s-]?robeson\b/i, "HUB-Robeson Center, Penn State campus"],
  [/\bpattee(?:\s+library)?\b/i, "Pattee Library, Penn State campus"],
  [/\bbeaver\s+stadium\b/i, "Beaver Stadium, University Park"],
  [/\bbryce\s+jordan\b/i, "Bryce Jordan Center, University Park"],
  [/\bold\s+main\b/i, "Old Main, Penn State campus"],
  [/\b(east|west|south|north|pollock)\s+halls?\b/i, (m) => `${cap(m[1])} Halls, Penn State campus`],
  [/\b(?:penn state|psu|university park)(?:\s+campus)?\b/i, "Penn State campus, State College"],
  // Streets and shopping
  [/\bbeaver\s+(?:ave(?:nue)?|canyon)\b/i, "Beaver Ave, State College"],
  [/\bcollege\s+ave(?:nue)?\b/i, "College Ave, State College"],
  [/\bcalder\s+way\b/i, "Calder Way, State College"],
  [/\batherton(?:\s+st(?:reet)?)?\b/i, "Atherton St, State College"],
  [/\ballen\s+st(?:reet)?\b/i, "Allen St, State College"],
  [/\bfraser\s+st(?:reet)?\b/i, "Fraser St, State College"],
  [/\bpugh\s+st(?:reet)?\b/i, "Pugh St, State College"],
  [/\bgarner\s+st(?:reet)?\b/i, "Garner St, State College"],
  [/\bburrowes\s+st(?:reet)?\b/i, "Burrowes St, State College"],
  [/\b(easterly|westerly)\s+park(?:way|wy)\b|\b(easterly|westerly)\s+pkwy\b/i, "Easterly Parkway, State College"],
  [/\bwaupelani\b/i, "Waupelani Dr, State College"],
  [/\bnittany\s+mall\b/i, "Nittany Mall, State College"],
  // Neighborhoods and nearby towns
  [/\bpark\s+forest\b/i, "Park Forest, State College"],
  [/\btoftrees\b/i, "Toftrees, State College"],
  [/\bhouserville\b/i, "Houserville"],
  [/\bboalsburg\b/i, "Boalsburg"],
  [/\bbellefonte\b/i, "Bellefonte"],
  [/\blemont\b/i, "Lemont"],
  [/\bpine\s+grove\s+mills\b/i, "Pine Grove Mills"],
  [/\bport\s+matilda\b/i, "Port Matilda"],
  [/\bcentre\s+hall\b/i, "Centre Hall"],
  [/\bpleasant\s+gap\b/i, "Pleasant Gap"],
  [/\bspring\s+mills\b/i, "Spring Mills"],
  [/\bmilesburg\b/i, "Milesburg"],
  [/\bphilipsburg\b/i, "Philipsburg"],
  [/\b(ferguson|patton|harris|college)\s+(?:township|twp)\b/i, (m) => `${cap(m[1])} Township`],
  // ZIP codes
  [/\b168(?:01|02|03|04|05)\b/, "State College, PA"],
  [/\b16823\b/, "Bellefonte, PA"],
  [/\b16827\b/, "Boalsburg, PA"],
  [/\b16828\b/, "Centre Hall, PA"],
  [/\b16865\b/, "Pine Grove Mills, PA"],
  [/\b16870\b/, "Port Matilda, PA"],
  // General words last
  [/\bcampus\b/i, "Near campus, State College"],
  [/\bdowntown\b/i, "Downtown State College"],
  [/\bstate\s+college\b/i, "State College"],
];

/** Names handed to the AI as hints about the area. */
export const KNOWN_AREAS = [
  "Penn State campus / University Park (HUB-Robeson Center, Pattee Library, Beaver Stadium, Old Main, the East, West, South, North and Pollock Halls)",
  "Downtown State College (College Ave, Beaver Ave, Allen St, Fraser St, Pugh St, Garner St, Burrowes St, Calder Way, Atherton St)",
  "Neighborhoods: Park Forest, Toftrees, Houserville, Waupelani Dr, Easterly and Westerly Parkway",
  "Nittany Mall",
  "Nearby towns: Boalsburg, Bellefonte, Lemont, Pine Grove Mills, Port Matilda, Centre Hall, Pleasant Gap, Spring Mills, Milesburg, Philipsburg",
  "Townships: Ferguson, Patton, Harris, College",
];

const NOT_PLACES = new Set(["good", "great", "excellent", "new", "like", "fair", "perfect", "working", "condition", "used", "very", "mint", "clean"]);
const NOT_STREET_WORDS = new Set([
  "month", "months", "year", "years", "day", "days", "hour", "hours", "week", "weeks", "time", "times", "used", "new", "great",
  "good", "owner", "owners", "bedroom", "bedrooms", "bed", "beds", "bath", "baths", "inch", "inches", "pack", "set",
]);

// "415 W Foster Ave": the street without the house number (a home address shouldn't be posted by accident)
const ADDRESS = /\b\d{1,5}\s+((?:[nsew]\.?\s+)?[a-z][a-z.'-]*(?:\s+[a-z][a-z.'-]*){0,2}\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|pkwy|parkway|dr|drive))\b/i;

/** Finds a pickup place or area in what the person wrote, or "" if there is none. */
export function findLocation(text: string): string {
  for (const [re, place] of PLACES) {
    const m = text.match(re);
    if (m) return typeof place === "function" ? place(m) : place;
  }

  const a = text.match(ADDRESS);
  if (a) {
    const words = a[1].toLowerCase().split(/\s+/).slice(0, -1);
    if (!words.some((w) => NOT_STREET_WORDS.has(w))) return cap(a[1].toLowerCase()).slice(0, 60);
  }

  // Otherwise, a capitalized place after "near", "at", "in", "by" or "around" (e.g. "pick up near Weis Market")
  const m = text.match(/\b(?:near|at|in|around|by|off)\s+((?:[A-Z][\w'&.-]*)(?:\s+[A-Z][\w'&.-]*){0,3})/);
  if (m && !NOT_PLACES.has(m[1].split(/\s+/)[0].toLowerCase())) return m[1].trim().slice(0, 60);
  return "";
}

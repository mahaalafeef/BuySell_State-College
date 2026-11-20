// The "no AI" way to turn a quick note into a tidy draft. It is used when the AI helper is switched off or can't be reached.
// It cuts a short title off the front of the note, tidies the writing, and finds the pickup place.

import { findLocation } from "./localPlaces";
import { ruleParse, type Draft } from "./ruleParse";

const SPELLING: [RegExp, string][] = [
  [/\byrs\b/gi, "years"],
  [/\byr\b/gi, "year"],
  [/\bw\/\s*/gi, "with "],
  [/\bb\/c\b/gi, "because"],
  [/\bobo\b/gi, "OBO"],
  [/\bavail\b/gi, "available"],
  [/\bapt\b/gi, "apartment"],
  [/\bincl\b/gi, "including"],
  [/\bi\b/g, "I"],
  [/\bim\b/gi, "I'm"],
  [/\bdont\b/gi, "don't"],
  [/\bcant\b/gi, "can't"],
  [/\bisnt\b/gi, "isn't"],
  [/\bthats\b/gi, "that's"],
];

const WORD_CASE: Record<string, string> = {
  ikea: "IKEA", hp: "HP", tv: "TV", usb: "USB", led: "LED", ps4: "PS4", ps5: "PS5", iphone: "iPhone", ipad: "iPad",
  macbook: "MacBook", airpods: "AirPods", xbox: "Xbox", lg: "LG", jbl: "JBL", gps: "GPS", pc: "PC", dvd: "DVD",
  ssd: "SSD", hdmi: "HDMI", suv: "SUV", "1br": "1BR", "2br": "2BR", "3br": "3BR", "4br": "4BR", "5br": "5BR",
};

const SMALL = new Set(["a", "an", "and", "of", "the", "for", "with", "in", "on", "to"]);

// Words that start the "tell us about it" part, so the title stops before them
const TITLE_STOP = new Set([
  "used", "new", "like", "brand", "works", "working", "great", "good", "excellent", "fair", "barely", "never", "only",
  "selling", "pick", "pickup", "asking", "bought", "perfect", "clean", "lightly", "very", "still", "obo", "firm", "mint",
  "condition", "moving", "must", "need", "near", "price",
]);

const PHONE = /\+?\d[\d\s().-]{8,16}\d/g;
// "text me 814-555-0123": the words in front of a number go with it
const CONTACT_WORDS = /(?:text|call|txt|whatsapp|reach me|contact me)(?:\s+me)?\s*(?:at|on)?\s*[:\-]?\s*(?=\+?\d[\d\s().-]{8,16}\d)/gi;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PRICE = /(?:\b(?:asking|price(?:\s+is)?|only|for)\s*[:\-]?\s*)?\$\s?\d[\d,]*(?:\.\d{1,2})?|\b\d[\d,]*(?:\.\d{1,2})?\s?(?:bucks|dollars|usd)\b/gi;

function tidy(s: string) {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([,;])\s*([.!?])/g, "$2")
    .replace(/^[\s,;:.\-–—]+|[\s,;:\-–—]+$/g, "")
    .trim();
}

function dropOpeners(s: string) {
  let out = s;
  for (let i = 0; i < 3; i++) {
    out = out.replace(
      /^(?:hi+|hey|hello|wts|selling|i(?:'m| am)\s+selling|i\s+have\s+(?:a|an|some)?|we(?:'re| are)\s+selling|my)\b[\s:,!.-]*/i,
      "",
    );
  }
  return out;
}

function titleCase(words: string[]) {
  return words
    .map((w, i) => {
      const mapped = WORD_CASE[w.toLowerCase()];
      if (mapped) return mapped;
      if (/[A-Z]/.test(w)) return w; // already has capitals, e.g. "iPhone" or "DeWalt"
      if (i > 0 && SMALL.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function makeTitle(text: string): string {
  const firstClause = dropOpeners(text).split(/[.!?\n,;]|\s[-–—]\s/)[0] ?? "";
  const words = tidy(firstClause).split(/\s+/).filter(Boolean);
  let cut = words.length;
  for (let i = 1; i < words.length; i++) {
    if (TITLE_STOP.has(words[i].toLowerCase())) {
      cut = i;
      break;
    }
  }
  let title = titleCase(words.slice(0, Math.min(cut, 8)));
  if (title.length > 60) title = title.slice(0, 60).replace(/\s+\S*$/, "");
  return title;
}

function makeDescription(text: string): string {
  let t = text;
  for (const [re, to] of SPELLING) t = t.replace(re, to);
  const sentences = dropOpeners(t)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => tidy(s))
    .filter((s) => /[A-Za-z]/.test(s))
    .map((s) => {
      const cased = s
        .split(/\s+/)
        .map((w) => WORD_CASE[w.toLowerCase()] ?? w)
        .join(" ");
      const capital = cased.charAt(0).toUpperCase() + cased.slice(1);
      return /[.!?]$/.test(capital) ? capital : `${capital}.`;
    });
  return sentences.join(" ").slice(0, 4000);
}

/** A tidy draft from a short note, without AI. */
export function smartFallbackDraft(note: string): Draft {
  const base = ruleParse(note);
  const housing = base.condition === "Rental";

  // Keep the rent in a housing description; for items the price has its own field
  let body = note.replace(CONTACT_WORDS, " ").replace(PHONE, " ").replace(EMAIL, " ");
  if (!housing) body = body.replace(PRICE, " ");
  body = body.replace(/\bfor sale\b/gi, " ");

  let price = base.price;
  if (!price) {
    const m =
      note.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\s?(?:bucks|dollars|usd)\b/i) ||
      (housing ? note.match(/\b(\d{3,4})\s*(?:a|per|\/)\s*(?:month|mo)\b/i) : null);
    if (m) price = m[1].replace(/,/g, "");
  }

  let titleSource = note.replace(CONTACT_WORDS, " ").replace(PHONE, " ").replace(EMAIL, " ").replace(PRICE, " ").replace(/\bfor sale\b/gi, " ");
  for (const [re, to] of SPELLING) titleSource = titleSource.replace(re, to);
  titleSource = tidy(titleSource);
  const title = makeTitle(titleSource) || base.title;
  const description = makeDescription(body) || base.description;

  return { ...base, title, description, price, location: findLocation(note) || base.location, whatsapp: "" };
}

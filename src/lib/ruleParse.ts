// Free (no AI) reader for pasted WhatsApp posts. It makes a best guess; the admin always reviews it.

export type Draft = {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  location: string;
  contact: string;
  whatsapp: string;
  phone: string;
};

const ITEM_CATEGORIES: [RegExp, string][] = [
  [/\b(laptop|macbook|iphone|phone|ipad|tablet|tv|television|monitor|camera|headphones|airpods|speaker|console|playstation|xbox|printer)\b/i, "Electronics"],
  [/\b(couch|sofa|desk|chair|table|bed|mattress|dresser|lamp|shelf|bookcase|futon|nightstand)\b/i, "Furniture"],
  [/\b(shirt|jacket|dress|shoes|sneakers|jeans|coat|hoodie|sweater|boots)\b/i, "Clothing"],
  [/\b(car|bike|bicycle|scooter|truck|motorcycle|moped)\b/i, "Vehicles"],
  [/\b(textbook|book|books|dvd|vinyl|novel)\b/i, "Books & media"],
  [/\b(tent|ski|skis|snowboard|golf|kayak|helmet|gym)\b/i, "Sports & outdoors"],
  [/\b(toy|toys|lego|board game|puzzle)\b/i, "Toys & games"],
  [/\b(plant|garden|grill|vacuum|lawn)\b/i, "Home & garden"],
];

export function ruleParse(text: string): Draft {
  // Copied WhatsApp messages can start with "[3:45 PM, 5/12/2026] Name:", so strip that off
  // Handles both "[5/12/26, 3:45 PM] Name:" (iPhone) and "5/12/26, 3:45 PM - Name:" (Android)
  const date = String.raw`\d{1,2}[/.]\d{1,2}[/.]\d{2,4}`;
  const time = String.raw`\d{1,2}:\d{2}(?::\d{2})?\s?(?:[AP]M)?`;
  const prefix = new RegExp(String.raw`^\[?(?:${date},?\s+${time}|${time},?\s+${date})\]?\s*-?\s*[^:]{1,40}:\s*`, "i");
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(prefix, ""))
    .filter(Boolean);
  const body = lines.join("\n");

  // Title: the first sentence of the post, kept short
  // Skip lines that are only a price or a symbol, so the title is a line with real words
  const first = (lines.find((l) => /[A-Za-z]{3,}/.test(l)) ?? lines[0] ?? "").replace(/[*_~]/g, "").trim();
  let title = (first.split(/(?<=[.!?])\s|\s[-–—]\s/)[0] || first).trim();
  if (title.length < 3) title = body.replace(/\s+/g, " ").slice(0, 60);
  if (title.length > 70) title = title.slice(0, 70).replace(/\s+\S*$/, "");

  const priceMatch =
    body.match(/\$\s?(\d[\d,]*(?:\.\d{1,2})?)/) ||
    body.match(/(\d[\d,]*(?:\.\d{1,2})?)\s?(?:usd|dollars)\b/i) ||
    body.match(/\bprice\s*[:\-]?\s*\$?\s?(\d[\d,]*(?:\.\d{1,2})?)/i);
  const price = priceMatch ? priceMatch[1].replace(/,/g, "") : "";

  const phoneMatch = body.match(/(\+?\d[\d\s().-]{8,16}\d)/);
  let phone = "";
  if (phoneMatch) {
    const digits = phoneMatch[1].replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) phone = phoneMatch[1].trim();
  }

  const sublease = /\b(sublease|sublet|subletting)\b/i.test(body);
  const housing = sublease || /\b(apartment|apt|bedroom|bedrooms|br|studio|for rent|room for rent|lease|roommate|rent)\b/i.test(body);

  let category = "";
  let condition = "";
  if (housing) {
    category = sublease ? "Sublease" : "Housing for rent";
    condition = "Rental";
  } else {
    category = ITEM_CATEGORIES.find(([re]) => re.test(body))?.[1] ?? "";
    if (/\blike new\b/i.test(body)) condition = "Like new";
    else if (/\bfor parts\b|\bbroken\b/i.test(body)) condition = "For parts";
    else if (/\b(brand new|unopened|new in box|\bnew\b)/i.test(body)) condition = "New";
    else if (/\bfair\b/i.test(body)) condition = "Fair";
    else if (/\b(good condition|used|great condition|works great)\b/i.test(body)) condition = "Good";
  }

  return {
    title,
    description: body.slice(0, 4000),
    price,
    category,
    condition,
    location: /state college/i.test(body) ? "State College" : "",
    contact: phone ? `Call or text ${phone}` : "",
    whatsapp: phone,
    phone,
  };
}

// Used by the seller form. Suggestions are based on the note and can be edited.
export function draftItemListing(note: string) {
  const lines = note
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/[\t ]+/g, " "))
    .filter(Boolean);
  const text = lines.join("\n");
  const first = lines[0]?.split(/[.!?]\s+|\s+[-–—]\s+/)[0] ?? "";
  const title = first
    .replace(/^(?:selling|giving away|for sale\s*:?)\s+/i, "")
    .replace(/\s+(?:for\s+)?\$\s*\d.*$/i, "")
    .replace(/[.!?]+$/, "")
    .trim()
    .slice(0, 100);
  const cleanTitle = title.replace(/^\p{L}/u, (letter) => letter.toUpperCase());

  const amount = /(?:^|\n)price\s*:\s*\$?\s*(\d{1,7}(?:\.\d{1,2})?)(?![\d,]|\.\d)|(?:^|\s)asking\s+\$?\s*(\d{1,7}(?:\.\d{1,2})?)(?![\d,]|\.\d)/i.exec(text);
  const mentionedAmounts = Array.from(
    text.matchAll(/\$\s*(\d{1,3}(?:,\d{3})+|\d{1,7})(\.\d{1,2})?(?![\d,]|\.\d)/g),
    ([, dollars, cents]) => dollars.replace(/,/g, "") + (cents ?? ""),
  );
  const free = /^(?:free(?:\s|[.!:]|$)|giving\s+(?:it\s+)?away\b)|(?:^|\n)price\s*:\s*free\b/i.test(text);
  const uniqueAmounts = [...new Set(mentionedAmounts)];
  const hasPriceContext = !/\b(?:originally|paid|retail|worth|cost me|costs? new)\b|\bwas\s+\$/i.test(text);
  const tentativePrice = amount?.[1] ?? amount?.[2] ??
    (free ? "0" : uniqueAmounts.length === 1 && hasPriceContext ? uniqueAmounts[0] : "");
  const price = /^\d{1,7}(\.\d{1,2})?$/.test(tentativePrice) ? tentativePrice : "";

  const category = /\b(?:hole[ -]punch|drill|toolbox)\b/i.test(cleanTitle)
    ? "Home & garden"
    : ITEM_CATEGORIES.find(([pattern]) => pattern.test(cleanTitle))?.[1] ?? "";
  const condition =
    /\b(?:for parts|broken|does(?:n't| not) work)\b/i.test(text) ? "For parts" :
    /\b(?:like new|barely used)\b/i.test(text) ? "Like new" :
    /\b(?:never used|unused|unopened|brand new|new in box)\b|(?:^|\n)condition\s*:\s*new\b/i.test(text) ? "New" :
    /\bfair condition\b/i.test(text) ? "Fair" :
    /\b(?:good condition|great condition|works great)\b/i.test(text) ? "Good" : "";

  const description = lines
    .map((line) => line.replace(/\bnever used\s+ordered by mistake\b/i, "Never used. Ordered by mistake"))
    .map((line) => line.replace(/^\p{L}/u, (letter) => letter.toUpperCase()).replace(/([^.!?])$/, "$1."))
    .join("\n")
    .slice(0, 4000);

  return {
    title: cleanTitle.length >= 3 ? cleanTitle : "",
    description: description.length >= 10 ? description : "",
    price,
    category,
    condition,
  };
}

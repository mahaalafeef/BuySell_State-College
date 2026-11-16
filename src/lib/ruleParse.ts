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

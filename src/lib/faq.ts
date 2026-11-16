// Free, built-in answers for the Help chat. Used when there is no ANTHROPIC_API_KEY
// (or if the AI is unavailable). Edit the answers or add new entries here.

type Ctx = { autoApprove: boolean };
type Faq = { keywords: string[]; answer: (ctx: Ctx) => string };

export const NOT_SURE =
  "I'm not sure about that one. Tap \"Talk to a person\" below and our team will get back to you.";

const FAQS: Faq[] = [
  {
    keywords: ["join", "whatsapp group", "invite", "member", "membership", "join the group"],
    answer: () =>
      "To join our WhatsApp group, open the Join page (add /join to the end of this site's address). Send a request with your name and WhatsApp number, and tell us how you are connected to Penn State or State College. We review each one and message you on WhatsApp with the invite.",
  },
  {
    keywords: ["post", "sell", "list my", "list an", "list a", "create a listing", "add a listing", "new listing", "put up", "how do i list"],
    answer: () =>
      "Only approved members can post. To post, tap \"Post a listing\" at the top, choose an item or housing, fill in the details, add photos if you like, and pick a passcode. Your phone number stays private. It is only used to edit your listing later.",
  },
  {
    keywords: ["edit", "change my", "modify", "update my", "delete", "remove my", "mark as sold", "sold", "relist", "my listing"],
    answer: () =>
      "Go to \"My listings\" and enter the post number you were given after posting (like BSC-0042), plus your passcode OR the phone number you listed with. You can also enter just your phone number to see all your listings. Once you're in, you can edit, mark as sold, relist, or delete.",
  },
  {
    keywords: ["forgot", "lost", "passcode", "password", "listing id", "can't edit", "cant edit", "locked", "locked out"],
    answer: () =>
      "No problem. Use the phone number you entered when posting instead. On \"My listings\", leave the listing ID blank and enter your phone number to see all your listings. After 5 wrong tries a listing is locked for 15 minutes. If you're still stuck, tap \"Talk to a person\".",
  },
  {
    keywords: ["approve", "approval", "review", "pending", "waiting", "not showing", "not showing up", "visible", "go live", "when will", "isn't showing", "isnt showing"],
    answer: ({ autoApprove }) =>
      autoApprove
        ? "New listings go live right away. If yours isn't showing, try refreshing the page and check the right section (For sale or Housing)."
        : "Every new listing is reviewed by our team before it appears. You can still view and edit it while you wait. Edits to a live listing may be reviewed again.",
  },
  {
    keywords: ["photo", "picture", "image", "upload"],
    answer: () =>
      "You can add up to 5 photos when posting or editing. The first photo is the cover. On a phone you can take a photo or choose one from your library.",
  },
  {
    keywords: ["housing", "sublease", "sublet", "rent", "apartment", "room", "lease", "roommate"],
    answer: () =>
      "Tap \"Housing\" at the top to browse rooms, apartments, and subleases. To post one, tap \"Post a listing\" and choose \"Housing or a sublease\". Rent is shown per month, so put details like bedrooms, move-in date, and lease length in the description.",
  },
  {
    keywords: ["contact", "message the seller", "reach the seller", "whatsapp", "buy this", "interested", "get in touch"],
    answer: () =>
      "Open the listing and use the contact details shown on it (only approved members can see them). If the seller added WhatsApp, you'll also see a \"Message on WhatsApp\" button.",
  },
  {
    keywords: ["pay", "payment", "ship", "shipping", "scam", "safe", "safety", "fraud", "deposit", "report"],
    answer: () =>
      "This site doesn't handle payments or shipping. Meet in a public place, check items before paying, and never send money to someone you haven't met. If a listing looks like a scam, tap \"Talk to a person\" to report it.",
  },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function answerFromFaq(question: string, ctx: Ctx): string | null {
  const q = question.toLowerCase().trim();
  if (!q) return null;

  if (q.length < 30 && /^(hi|hello|hey|hola|good (morning|afternoon|evening))\b/.test(q)) {
    return "Hi! I can help with posting, editing a listing, housing, photos, and approval. What would you like to know?";
  }

  let best: { score: number; faq: Faq } | null = null;
  for (const faq of FAQS) {
    const score = faq.keywords.filter((k) => new RegExp(`\\b${escape(k)}`, "i").test(q)).length;
    if (score > 0 && (!best || score > best.score)) best = { score, faq };
  }
  return best ? best.faq.answer(ctx) : null;
}

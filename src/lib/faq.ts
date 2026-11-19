// Free, built-in answers for the Help chat. Used when there is no ANTHROPIC_API_KEY
// (or if the AI is unavailable). Edit the answers or add new entries here.

type Ctx = { autoApprove: boolean };
type Faq = { keywords: string[]; answer: (ctx: Ctx) => string };

export const NOT_SURE =
  "I'm not sure about that one. Tap \"Talk to a person\" below and our team will get back to you.";

const FAQS: Faq[] = [
  {
    keywords: ["message the seller", "message a seller", "message a buyer", "contact the seller", "how do i contact", "inbox", "messages", "chat with the seller", "private message"],
    answer: () =>
      "Open a listing and tap \"Message the seller\". Your conversations are in \"Messages\" in the top menu, with a red number when something new is waiting, and you also get an email. Messages on this site can be read by the site admin to keep everyone safe, so never send passwords, codes or payment details, and never pay before you have seen the item. If something seems wrong, open the conversation and tap \"Report this conversation\".",
  },
  {
    keywords: ["share my listing", "share a listing", "share to the group", "share to a group", "post to the group", "send to the group", "share on whatsapp", "post my listing in the group"],
    answer: () =>
      "Once your listing is live, tap \"Share to a WhatsApp group\" on the page you see after posting, or \"Share on WhatsApp\" on your listing or in My account. WhatsApp opens with the title, price and link ready. Choose the group and press send. Your contact details are never included in the message. Members of the group can open the link to see photos, and approved members can see how to contact you.",
  },
  {
    keywords: ["join", "whatsapp group", "invite", "member", "membership", "join the group"],
    answer: () =>
      "To join our WhatsApp group, open the Join page (add /join to the end of this site's address). Send a request with your name, Gmail address and WhatsApp number, and tell us how you are connected to Penn State or State College. We review each one and email you a link to choose your password.",
  },
  {
    keywords: ["post", "sell", "list my", "list an", "list a", "create a listing", "add a listing", "new listing", "put up", "how do i list"],
    answer: () =>
      "Only approved members can post. To post, tap \"Post a listing\" at the top, choose an item or housing, fill in the details, add photos if you like,. It is saved in your account, so you can edit it later without a passcode.",
  },
  {
    keywords: ["rating", "ratings", "stars", "star rating", "rate a seller", "rate the seller", "leave a review", "write a review", "seller review", "reviews of sellers"],
    answer: () =>
      "Approved members can rate sellers from 1 to 5 stars and leave a short comment. Open a listing, tap the seller's name or \"See reviews or leave one\", and fill in the form. You can update or delete your review later, and you can't review yourself. Sellers are shown by first name and last initial.",
  },
  {
    keywords: ["edit", "change my", "modify", "update my", "delete", "remove my", "mark as sold", "mark as pending", "mark pending", "sale pending", "sold", "relist", "my listing", "my account"],
    answer: () =>
      "Open \"My account\" in the top menu. Every listing you post while signed in is saved there, and you can edit it, mark it as pending (a sale is in progress) or sold, relist it, or delete it.",
  },
  {
    keywords: ["forgot", "lost", "passcode", "password", "listing id", "can't edit", "cant edit", "locked", "locked out", "log in", "login"],
    answer: () =>
      "Listings are edited from your account, so there is no passcode to remember. Log in with your WhatsApp number and password, then open \"My account\" in the top menu. Forgot your password? On the log in page, tap \"Ask for a password reset link\". Our team will check it is you on WhatsApp and send you a link to choose a new one. Each WhatsApp number can only have one account, so if you try to join again with the same number you will be asked to log in instead.",
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

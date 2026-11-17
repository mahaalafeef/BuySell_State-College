import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/config";
import { JOIN_REQUIRES_PROOF } from "@/lib/join";

export const metadata: Metadata = { title: "Privacy Policy" };

const contactLine = CONTACT_EMAIL
  ? `To ask a question or make a request, email ${CONTACT_EMAIL}, or use the "Talk to a person" option in the site's chat assistant.`
  : `To ask a question or make a request, use the "Talk to a person" option in the site's chat assistant.`;

const sections: LegalSection[] = [
  {
    title: "What this policy covers",
    paragraphs: [
      `This policy explains what information ${SITE_NAME} collects, how it is used and shared, and the choices you have. By using the Site you agree to it. It is part of our Terms of Use.`,
    ],
  },
  {
    title: "Information we collect",
    bullets: [
      "Request to join: your name, WhatsApp number or username, how you are connected (for example, student or resident), an optional note" + (JOIN_REQUIRES_PROOF ? ", and a photo of your proof of connection." : "."),
      "Account activity: which listings belong to your account, their status, and the ratings and reviews you give or receive.",
      "Member account: a password (stored only as a one-way scrambled hash, never in readable form) and a personal sign-in link.",
      "Listings: the title, description, price, category, condition, location or neighborhood, photos, the contact details you choose to show, an optional WhatsApp number or username. Older listings may also have a private phone number and passcode that were used to prove ownership (the passcode is stored only as a hash, and the phone number as its last 10 digits).",
      "Messages to us: your name, how to reach you, and your message, plus the recent chat conversation if you use \"Talk to a person\".",
      "Chat assistant: the questions you type to the assistant.",
      "Technical data: a one-way scrambled version of your IP address, used only to limit spam and repeated attempts. We do not store your actual IP address in our database. Our hosting provider may keep standard server logs.",
      "Cookies: small files that keep you signed in (see Cookies below). We do not use advertising or tracking cookies.",
    ],
  },
  {
    title: "How we use it",
    bullets: [
      "To review and approve membership requests and keep the Site members-only.",
      "To show listings, and to let approved members contact sellers.",
      "To let sellers manage their own listings.",
      "To answer your questions and messages, and to run the chat assistant.",
      "To prevent spam, fraud, and abuse, to enforce our Terms, and to keep the Site secure.",
      "To comply with the law.",
    ],
    paragraphs: ["We do not sell your personal information, and we do not use it for advertising."],
  },
  {
    title: "Who can see what",
    bullets: [
      "Anyone (even without an account) may be able to see a listing's title, description, price, category, condition, location or neighborhood, and photos. Do not put your home address, phone number, or other private details in these fields or in your photos.",
      "Only approved members and the admin can see the contact details a seller chose to show, including the WhatsApp button.",
      "Seller profiles, ratings, and reviews are visible only to approved members and the admin. Members appear by first name and last initial.",
      "Only the admin can see your join request, including your name and WhatsApp number" + (JOIN_REQUIRES_PROOF ? ", and proof photo." : "."),
      "Listing photos are stored with a public web address. Anyone who has the exact link to a photo can open it, even if they are not a member.",
      "Your private phone number and passcode are never shown to other users.",
    ],
    paragraphs: [
      "Once you give your contact details to another member, or message someone on WhatsApp, we cannot control what that person does with them. Members agree not to misuse or share other members' information, but we cannot guarantee they will follow that rule.",
    ],
  },
  ...(JOIN_REQUIRES_PROOF
    ? [
      {
        title: "Your proof photo",
        paragraphs: [
          "The photo you send with a join request is used only so the admin can confirm your connection. It is visible only to the admin and is deleted from our database as soon as your request is approved or rejected. Please cover anything that is not needed, such as ID numbers, birth date, and account numbers.",
        ],
      },
      ]
    : []),
  {
    title: "Services that help us run the Site",
    paragraphs: ["We share information with service providers only as needed to run the Site. These may include:"],
    bullets: [
      "Hosting and database providers (for example Vercel and Neon), which store the Site's data and files.",
      "An email service (for example Resend), used to notify the admin of new requests, listings, and messages.",
      "An AI provider (for example Anthropic), which receives the questions you type to the chat assistant so it can answer. Do not enter sensitive personal information into the chat.",
      "WhatsApp (Meta), which handles messages when you or the admin use WhatsApp. WhatsApp's own privacy policy applies to those messages.",
    ],
  },
  {
    title: "Other sharing",
    paragraphs: [
      "We may share information when we believe it is required by law, to respond to a lawful request, to protect someone's safety, or to protect our rights and the Site. If the Site is ever transferred to another owner, information may be transferred with it.",
    ],
  },
  {
    title: "Cookies",
    bullets: [
      "Member sign-in cookie: keeps you signed in, up to 90 days.",
      "Join-request cookie: lets you check on your request from the same browser, up to 60 days.",
      "Seller session cookie: lets you manage a listing after proving you own it, for 60 minutes.",
      "Admin cookie: for the site administrator only.",
    ],
    paragraphs: ["These are needed for the Site to work. You can clear cookies in your browser, but you may be signed out."],
  },
  {
    title: "How long we keep information",
    bullets: [
      ...(JOIN_REQUIRES_PROOF ? ["Proof photos: deleted when your request is decided."] : []),
      "Join request and member records: kept while you are a member and for a reasonable time afterward, then deleted on request or when no longer needed.",
      "Listings: kept until you or we delete them.",
      "Reviews: kept until the person who wrote it or the admin deletes it, or until the seller's or reviewer's membership record is deleted.",
      "Messages to us: kept as long as needed to help you and then deleted.",
      "Scrambled IP records for spam control: kept for about two days.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You can edit or delete your own listings at any time from your account. You can ask us to see, correct, or delete the information we hold about you, or to close your membership. We may need to verify who you are first, and we may keep some information where the law allows or requires it.",
      contactLine,
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We use reasonable measures to protect your information, such as hashing passwords and limiting who can see private data. No website can be completely secure, and we cannot promise that information will never be accessed, lost, or disclosed. You use the Site at your own risk.",
    ],
  },
  {
    title: "Children",
    paragraphs: [
      "The Site is only for people 18 and older. We do not knowingly collect information from anyone under 18. If you believe a minor has joined, contact us and we will remove the information.",
    ],
  },
  {
    title: "Changes to this policy",
    paragraphs: [
      "We may update this policy from time to time. We will change the date at the top when we do. Continuing to use the Site after a change means you accept the updated policy.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This explains what information we collect, how we use it, and who can see it."
      sections={sections}
    />
  );
}

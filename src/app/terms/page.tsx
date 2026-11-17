import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Terms of Use" };

const contactLine = CONTACT_EMAIL
  ? `Questions about these Terms? Email ${CONTACT_EMAIL}, or use the "Talk to a person" option in the site's chat assistant.`
  : `Questions about these Terms? Use the "Talk to a person" option in the site's chat assistant.`;

const sections: LegalSection[] = [
  {
    title: "Who we are and what this site is",
    paragraphs: [
      `${SITE_NAME} (the "Site", "we", "us") is an online bulletin board where people in and around State College, Pennsylvania can post items for sale and housing or sublease listings, and contact each other. We are a venue only.`,
      `${SITE_NAME} is an independent community project. It is NOT affiliated with, endorsed by, or sponsored by The Pennsylvania State University ("Penn State"). References to Penn State only describe who may join.`,
    ],
  },
  {
    title: "Accepting these Terms",
    paragraphs: [
      "By requesting to join, logging in, browsing, posting a listing, or contacting a seller, you agree to these Terms of Use and our Privacy Policy. If you do not agree, do not use the Site.",
    ],
  },
  {
    title: "Who can use the Site",
    bullets: [
      "You must be at least 18 years old.",
      "Contact details and posting are limited to approved members. We decide who is approved, at our sole discretion, and we may ask for proof of your connection to Penn State or State College.",
      "We may refuse, suspend, or remove anyone's access at any time, with or without a reason.",
      "You are responsible for keeping your password and personal member link private. Anything done with them is treated as done by you.",
    ],
  },
  {
    title: "We are not part of your transactions",
    paragraphs: [
      "We do not own, inspect, sell, buy, rent, or deliver anything listed on the Site, and we do not handle payments. Any deal is strictly between the buyer and the seller (or the tenant and the person offering housing).",
      "We do not guarantee that any listing is accurate, legal, safe, available, or of any particular quality, or that any person is who they say they are. We do not verify members' identities beyond a basic review, and approval is NOT an endorsement or a background check.",
      "You alone are responsible for deciding whether to deal with someone, for checking the item or property, and for any agreement you make.",
    ],
  },
  {
    title: "Safety and common sense",
    paragraphs: ["Meeting strangers and exchanging money carries risk. We strongly suggest that you:"],
    bullets: [
      "Meet in a busy public place in daylight, and tell someone where you are going.",
      "Inspect items before paying. Do not pay in advance for something you have not seen.",
      "Be careful with wire transfers, gift cards, cryptocurrency, and overpayment or \"shipping agent\" requests. These are common scams.",
      "For housing and subleases, confirm the person has the right to rent or sublease (for example, that the landlord has approved a sublease), view the place in person, and put the agreement in writing.",
      "For vehicles, check the title, VIN, and ownership, and complete the legal paperwork required in Pennsylvania.",
      "Report suspicious listings or people to us right away. In an emergency, call 911.",
    ],
  },
  {
    title: "Your content and your conduct",
    paragraphs: [
      "You are solely responsible for everything you post (text, photos, prices, contact details) and for your communications with other members. By posting you promise that the content is accurate, that you own it or have permission to use it, and that it does not break any law or anyone's rights.",
      "You grant us a free, non-exclusive, worldwide license to host, display, and reproduce your listing content on the Site for as long as it is posted, so that the Site can work. You keep ownership of your content.",
      "You agree NOT to:",
    ],
    bullets: [
      "Post anything false, misleading, fraudulent, stolen, counterfeit, or that you do not have the right to sell or rent.",
      "Post prohibited items: illegal drugs or paraphernalia, weapons, firearms, ammunition, or explosives, alcohol, tobacco or vaping products, recalled or unsafe goods, adult content, human remains, live animals, academic services such as essays or exam answers, or anything else illegal to sell in Pennsylvania or under federal law.",
      "Discriminate in housing or in any other offer. Housing listings and your conduct must follow the federal Fair Housing Act, the Pennsylvania Human Relations Act, and local laws. Do not state or imply a preference or limitation based on race, color, religion, national origin, sex, disability, familial status, age, or any other protected class.",
      "Harass, threaten, or abuse anyone, or send spam or unwanted promotions.",
      "Copy, scrape, or collect members' contact details or listings, or use them for anything other than the transaction you are contacting them about.",
      "Share another member's information outside the Site, or share your member login with other people.",
      "Interfere with or try to break into the Site, bypass its limits, or use bots or automated tools.",
    ],
  },
  {
    title: "Moderation",
    paragraphs: [
      "We may review, approve, reject, edit, or remove any listing or account at any time, for any reason, without notice. We are not required to monitor content and are not responsible for content we have not removed. Approval of a listing does not mean we have checked it.",
    ],
  },
  {
    title: "Your account and your listings",
    paragraphs: [
      "Listings you post while signed in are saved to your member account. You can edit them, mark them as pending (a sale is in progress) or sold, relist them, or delete them. You are responsible for keeping the status of your listings accurate. Deleting a listing removes it permanently.",
    ],
  },
  {
    title: "Ratings and reviews",
    paragraphs: ["Approved members can rate sellers and write reviews. By posting a review you agree that:"],
    bullets: [
      "It reflects your own honest experience, and you have no conflict of interest with the seller.",
      "It does not include threats, harassment, hate, private information such as phone numbers or addresses, or anything illegal or untrue.",
      "Your review is shown to other approved members under your first name and last initial.",
      "We may remove any review or rating at any time. Reviews are opinions of members, not of the Site, and we do not verify that a sale took place.",
    ],
  },
  {
    title: "The chat assistant",
    paragraphs: [
      "The Site may include an automated chat assistant. It can be wrong and gives general information about how the Site works. It is not legal, financial, housing, or safety advice. Please do not put sensitive personal information in the chat.",
    ],
  },
  {
    title: "Third-party services and links",
    paragraphs: [
      "The Site relies on third-party services, including WhatsApp for messaging. We do not control them and are not responsible for them, for messages you send through them, or for how they use your information. Your use of those services is governed by their own terms.",
    ],
  },
  {
    title: "Disclaimer of warranties",
    paragraphs: [
      `THE SITE AND EVERYTHING ON IT ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, AND NON-INFRINGEMENT. WE DO NOT PROMISE THAT THE SITE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.`,
    ],
  },
  {
    title: "Limitation of liability",
    paragraphs: [
      "TO THE FULLEST EXTENT ALLOWED BY LAW, THE SITE'S OWNERS, OPERATORS, ADMINISTRATORS, VOLUNTEERS, AND SERVICE PROVIDERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF MONEY, PROFITS, DATA, OR PROPERTY, OR FOR ANY PERSONAL INJURY OR DEATH, ARISING FROM OR RELATED TO (A) YOUR USE OF THE SITE, (B) ANY LISTING, TRANSACTION, OR AGREEMENT BETWEEN USERS, (C) THE CONDUCT OF ANY USER, ONLINE OR OFFLINE, OR (D) UNAUTHORIZED ACCESS TO YOUR INFORMATION, EVEN IF WE WERE TOLD SUCH DAMAGES WERE POSSIBLE.",
      "If, despite this, we are found liable to you, our total liability for all claims is limited to $100. Some places do not allow certain limits, so parts of this section may not apply to you.",
    ],
  },
  {
    title: "Disputes between users",
    paragraphs: [
      "If you have a dispute with another user, you must resolve it directly with that user. You release us from claims, demands, and damages of any kind arising out of disputes between you and other users.",
    ],
  },
  {
    title: "You will cover claims caused by you",
    paragraphs: [
      "You agree to defend, indemnify, and hold harmless the Site, its owners, operators, administrators, volunteers, and service providers from any claim, loss, or expense (including reasonable attorneys' fees) arising from your content, your use of the Site, your dealings with other users, or your breach of these Terms or any law.",
    ],
  },
  {
    title: "Ending access",
    paragraphs: [
      "You may stop using the Site and ask us to delete your account or listings at any time. We may suspend or end your access at any time. Sections that by their nature should continue (such as the disclaimers, limits of liability, and indemnity) will continue after your access ends.",
    ],
  },
  {
    title: "Changes to the Site and these Terms",
    paragraphs: [
      "We may change or shut down the Site, or change these Terms, at any time. When we change the Terms we will update the date above. If you keep using the Site after a change, you accept the new Terms.",
    ],
  },
  {
    title: "Governing law and where disputes are heard",
    paragraphs: [
      "These Terms are governed by the laws of the Commonwealth of Pennsylvania, without regard to its conflict-of-law rules. Any legal action about the Site must be brought in the state or federal courts located in Centre County, Pennsylvania, and you consent to those courts' jurisdiction.",
    ],
  },
  {
    title: "General",
    paragraphs: [
      "If any part of these Terms is found unenforceable, the rest stays in effect. Our not enforcing a part of the Terms is not a waiver of it. These Terms and the Privacy Policy are the entire agreement between you and us about the Site.",
      contactLine,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="Please read these terms carefully. They explain the rules for using the Site and the limits of our responsibility."
      sections={sections}
    />
  );
}

import { formatPrice } from "./config";

function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Sends an email to ADMIN_EMAIL through Resend. Skips quietly if email isn't set up. */
async function sendToAdmin(subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!key || !to) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Marketplace <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("Email failed:", res.status, await res.text());
  } catch (err) {
    console.error("Email failed:", err); // never block a visitor because of email
  }
}

type Pending = {
  id: string;
  title: string;
  priceCents: number;
  category: string;
  location: string;
  description: string;
};

export async function notifyAdminPending(listing: Pending, kind: "new" | "edited") {
  const subject = `${kind === "new" ? "New listing" : "Edited listing"} waiting for approval: ${listing.title}`;
  const html = `
    <h2>${esc(listing.title)}</h2>
    <p>${esc(formatPrice(listing.priceCents))}, ${esc(listing.category)}, ${esc(listing.location)}</p>
    <p>${esc(listing.description.slice(0, 500))}</p>
    <p><a href="${siteUrl()}/admin?status=PENDING">Review it in the admin page</a></p>`;
  await sendToAdmin(subject, html);
}

export async function notifyAdminSupport(msg: { name: string; contact: string; message: string }) {
  const html = `
    <h2>Message from ${esc(msg.name)}</h2>
    <p><strong>Reply to:</strong> ${esc(msg.contact)}</p>
    <p style="white-space:pre-wrap">${esc(msg.message)}</p>
    <p><a href="${siteUrl()}/admin/support">Open customer messages</a></p>`;
  await sendToAdmin(`Customer service message from ${msg.name}`, html);
}

import { SITE_NAME, formatPrice } from "./config";

function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Sends one email. Returns true if the mail service accepted it, and never throws.
 * Free option: a Gmail account with an "app password" (GMAIL_USER and GMAIL_APP_PASSWORD).
 * Or Resend (RESEND_API_KEY and EMAIL_FROM, which needs a domain you own).
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (user && pass) {
      const mod = (await import("nodemailer")) as unknown as { createTransport?: unknown; default?: unknown };
      const lib = (typeof mod.createTransport === "function" ? mod : mod.default) as typeof import("nodemailer");
      const transport = lib.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
      await transport.sendMail({ from: `"${SITE_NAME}" <${user}>`, to, subject, html });
      return true;
    }

    const key = process.env.RESEND_API_KEY;
    if (!key) return false;
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
    if (!res.ok) {
      console.error("Email failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email failed:", err); // never block a visitor because of email
    return false;
  }
}

/** Emails the admin (ADMIN_EMAIL, or the Gmail account that sends the mail). Skips quietly if email isn't set up. */
async function sendToAdmin(subject: string, html: string) {
  const to = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
  if (!to) return;
  await sendEmail(to, subject, html);
}

type Layout = { heading: string; lines: string[]; button?: { label: string; href: string }; note?: string };

/** A simple, readable email. Lines are HTML, so anything typed by a person must go through esc() first. */
function emailPage({ heading, lines, button, note }: Layout): string {
  const paragraphs = lines.map((l) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5">${l}</p>`).join("");
  const cta = button
    ? `<p style="margin:22px 0"><a href="${button.href}" style="background:#1d4e89;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">${esc(button.label)}</a></p>`
    : "";
  const small = note ? `<p style="margin:18px 0 0;font-size:13px;color:#666666">${note}</p>` : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#222222;max-width:520px;margin:0 auto;padding:8px">
    <h2 style="margin:0 0 16px">${esc(heading)}</h2>${paragraphs}${cta}${small}</div>`;
}

export function emailJoinReceived(a: { to: string; name: string; link: string }) {
  return sendEmail(
    a.to,
    `We got your request to join ${SITE_NAME}`,
    emailPage({
      heading: "We got your request",
      lines: [
        `Hi ${esc(a.name)},`,
        "Thanks for asking to join. We are looking at your request and will email you when it is decided.",
        "You can check on it any time with the button below.",
      ],
      button: { label: "Check my request", href: a.link },
      note: "Please do not share this link. When you are approved, it also lets you choose your password. If you did not ask to join, you can ignore this email.",
    }),
  );
}

export function emailApproved(a: { to: string; name: string; link: string }) {
  return sendEmail(
    a.to,
    `You're approved for ${SITE_NAME}`,
    emailPage({
      heading: "You're approved!",
      lines: [
        `Hi ${esc(a.name)},`,
        "Welcome! Choose a password to finish setting up your account.",
        "After that, you log in with this Gmail address and your password.",
      ],
      button: { label: "Choose my password", href: a.link },
      note: "Please do not share this link.",
    }),
  );
}

export function emailPasswordLink(a: { to: string; name: string; link: string; firstTime: boolean }) {
  return sendEmail(
    a.to,
    a.firstTime ? `Choose your password for ${SITE_NAME}` : `Reset your password for ${SITE_NAME}`,
    emailPage({
      heading: a.firstTime ? "Choose your password" : "Reset your password",
      lines: [
        `Hi ${esc(a.name)},`,
        a.firstTime
          ? "Use the button below to choose a password for your account."
          : "Someone asked to reset the password for your account. Use the button below to choose a new one.",
      ],
      button: { label: a.firstTime ? "Choose my password" : "Choose a new password", href: a.link },
      note: a.firstTime
        ? "Please do not share this link."
        : "This link works once and expires in one hour. If you did not ask for this, you can ignore this email and your password stays the same.",
    }),
  );
}

export function emailNewMessage(a: { to: string; name: string; fromName: string; listingTitle: string; link: string }) {
  return sendEmail(
    a.to,
    `New message about "${a.listingTitle}"`,
    emailPage({
      heading: "You have a new message",
      lines: [
        `Hi ${esc(a.name)},`,
        `${esc(a.fromName)} sent you a message about <strong>${esc(a.listingTitle)}</strong>.`,
        "Log in to read it and reply.",
      ],
      button: { label: "Open the conversation", href: a.link },
      note: "For everyone's safety, messages on the site can be read by the site admin. Never send passwords, codes or payment details, and never pay before you have seen an item.",
    }),
  );
}

export async function notifyAdminReport(a: { reporter: string; listingTitle: string; reason: string; link: string }) {
  const html = `
    <h2>A conversation was reported</h2>
    <p><strong>${esc(a.reporter)}</strong> reported a conversation about <strong>${esc(a.listingTitle)}</strong>.</p>
    <p>Reason: ${esc(a.reason)}</p>
    <p><a href="${a.link}">Read the conversation</a></p>`;
  await sendToAdmin(`Conversation reported: ${a.listingTitle}`, html);
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

export async function notifyAdminJoin(req: { name: string; role: string }) {
  const html = `
    <h2>New request to join the group</h2>
    <p><strong>${esc(req.name)}</strong> says they are: ${esc(req.role)}</p>
    <p><a href="${siteUrl()}/admin/join">Review it in the admin page</a></p>`;
  await sendToAdmin(`Join request from ${req.name}`, html);
}

export async function notifyAdminReset(req: { name: string }) {
  const html = `
    <h2>Password reset requested</h2>
    <p><strong>${esc(req.name)}</strong> says they forgot their password.</p>
    <p>Message them on WhatsApp to check it is really them, then reset it from the admin page.</p>
    <p><a href="${siteUrl()}/admin/resets">Open password reset requests</a></p>`;
  await sendToAdmin(`Password reset requested by ${req.name}`, html);
}

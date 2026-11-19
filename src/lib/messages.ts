export const MAX_MESSAGE_LENGTH = 1000;

/** Shown wherever people write messages, so nobody is surprised that the site team can read them. */
export const MESSAGE_NOTICE =
  "Messages are private from other members, but the site team can read them to prevent scams and abuse. Never share passwords or card details.";

/** Messages a member may send per hour. */
export const MESSAGES_PER_HOUR = 30;

/** Trims a message and checks its length. Returns the text, or an error to show the person. */
export function cleanMessage(raw: FormDataEntryValue | null): { text: string } | { error: string } {
  const text = String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (text.length === 0) return { error: "Please write a message." };
  if (text.length > MAX_MESSAGE_LENGTH) return { error: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.` };
  return { text };
}

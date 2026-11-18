// Hides phone numbers, emails, and chat links in text shown to visitors who aren't members,
// so contact details can't be shared around the members-only rule.

const HIDDEN = "[members only]";

export function maskContacts(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, HIDDEN) // emails
    .replace(/(?:https?:\/\/)?(?:wa\.me|chat\.whatsapp\.com|t\.me)\/\S+/gi, HIDDEN) // chat links
    .replace(/(?:\+?\(?\d[\s().-]{0,2}){9,15}\d/g, HIDDEN); // phone numbers
}

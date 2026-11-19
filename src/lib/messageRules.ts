export const MAX_MESSAGE_LENGTH = 1000;

/**
 * Words that often show up in scams. A message that uses one is NOT blocked, but the conversation is marked
 * so the admin sees it in "Needs a look".
 */
export const WATCH_PATTERN =
  /\b(?:gift\s?cards?|western\s?union|money\s?gram|wire\s(?:me|transfer)|bitcoin|crypto(?:currency)?|overpay(?:ment)?|shipping\s(?:agent|company)|send\s(?:me\s)?(?:a\s)?deposit|verification\scode|bit\.ly|tinyurl)\b/i;

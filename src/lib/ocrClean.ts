// Tidies text read from a screenshot (OCR): drops phone status bars and chat-app buttons, keeps the post itself.

const CLUTTER: RegExp[] = [
  /^\d{1,2}:\d{2}\b.{0,24}$/, // a clock time, maybe with signal and battery after it ("9:41 all LTE 87%")
  /^\d{1,3}\s?%$/, // battery
  /^(lte|5g|4g|3g|wi-?fi)$/i,
  /^(type a message|message|messages|send|search|back|today|yesterday|forwarded|edited|read more|reply|like|comment|share|save|more|photos?|video|you|online|typing\.*)\.?$/i,
  /^(marketplace|seller information|seller details|send seller a message|is this still available\??|message seller|send message|see all|follow|report listing)$/i,
]; // (a WhatsApp sender line looks like "~Name" and is handled separately below)

const SENDER = /^~\s?[^\d$]{2,30}$/;

export function cleanOcrText(raw: string): string {
  let rows = raw.replace(/\r/g, "").split("\n").map((l) => l.trim());

  // In a WhatsApp group screenshot, keep just the first message: it starts after the sender's "~Name" line
  // (everything before it is the group name) and ends where the next sender's line begins.
  const senders = rows.map((l, i) => (SENDER.test(l) ? i : -1)).filter((i) => i >= 0);
  if (senders.length > 0) rows = rows.slice(senders[0] + 1, senders[1] ?? rows.length);

  const lines = rows
    .map((l) =>
      l
        .replace(/^[\s<>«‹›»•·|©®~=_*#-]+(?=\w|\$)/, "") // stray symbols at the start of a line
        .replace(/\s+\d{1,2}:\d{2}\s?(?:[AP]M)?(?:\s*[✓✔√v/]+)?$/i, "") // message time at the end of a line
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter((l) => {
      if (l.length < 2) return false;
      const alnum = (l.match(/[A-Za-z0-9]/g) ?? []).length;
      if (alnum < 2) return false;
      if (alnum / l.length < 0.45 && l.length > 3) return false; // mostly symbols: OCR noise from a photo
      return !CLUTTER.some((re) => re.test(l));
    });
  return lines.join("\n").slice(0, 4000);
}

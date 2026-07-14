export function formatEventDateTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleString("zh-HK", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatEventTimeOnly(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleString("zh-HK", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatEventPeriod(startIso: string, endIso?: string | null) {
  if (!endIso) {
    return formatEventDateTime(startIso);
  }
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (start.toDateString() === end.toDateString()) {
    return `${formatEventDateTime(startIso)} - ${formatEventTimeOnly(endIso)}`;
  }
  return `${formatEventDateTime(startIso)} → ${formatEventDateTime(endIso)}`;
}

/** One-line blurb for OG / WhatsApp link previews. */
export function formatEventShareDescription(input: {
  startTime?: string | null;
  endTime?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
}): string {
  const parts: string[] = [];
  if (input.startTime) {
    parts.push(formatEventPeriod(input.startTime, input.endTime));
  }
  const venue = (input.locationName || "").trim();
  const address = (input.locationAddress || "").trim();
  if (venue && address) parts.push(`${venue} · ${address}`);
  else if (venue) parts.push(venue);
  else if (address) parts.push(address);
  return parts.join("\n") || "SportyFind 賽事／活動";
}

export function getSiteOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (site) return site;
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "https://sporty-find.vercel.app";
}

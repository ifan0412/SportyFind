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

/** Google Maps / Places helpers (browser). */

export function getGoogleMapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

/** Open Google Maps search for a venue / address query. */
export function googleMapsSearchUrl(query: string): string {
  const q = query.trim();
  if (!q) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Prefer full address, fall back to venue name. */
export function eventMapQuery(locationName?: string | null, locationAddress?: string | null): string {
  const address = (locationAddress || "").trim();
  const name = (locationName || "").trim();
  if (address && name && !address.includes(name)) return `${name}, ${address}`;
  return address || name;
}

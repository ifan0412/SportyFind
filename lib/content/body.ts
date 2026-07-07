/** Detect HTML vs legacy plain-text article bodies */
export function isHtmlBody(body: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(body.trim());
}

/** Strip HTML tags for search previews */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Plain-text length for character counters (preserves line breaks as single chars) */
export function plainTextLength(html: string): number {
  if (!html?.trim()) return 0;
  if (!isHtmlBody(html)) return html.length;
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\u200b/g, "")
    .length;
}

/** Suggested bio length guidance shown in placeholders */
export const BIO_CHAR_SUGGESTED_RANGE = "150–250";
export const BIO_CHAR_SUGGESTED_MAX = 250;

/** Max plain-text length for the profile card one-line bio (edit profile, /network cards) */
export const PROFILE_CARD_BIO_MAX = 72;

export function truncatePlainBio(text: string, max = PROFILE_CARD_BIO_MAX): string {
  const plain = stripHtml(text);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}

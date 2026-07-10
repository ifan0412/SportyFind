/**
 * Normalize TipTap HTML so blank lines and lists render consistently
 * (Tailwind preflight strips list styles; empty <p></p> collapses in browsers).
 */
export function normalizeRichHtml(html: string): string {
  if (!html?.trim()) return "";

  let out = html;

  // Empty paragraphs → visible line break
  out = out.replace(/<p([^>]*)>\s*<\/p>/gi, "<p$1><br></p>");
  out = out.replace(/<p([^>]*)><br\s+class="ProseMirror-trailingBreak"\s*\/?><\/p>/gi, "<p$1><br></p>");

  return out;
}

/** True when HTML has no meaningful text (TipTap empty doc, <p><br></p>, etc.) */
export function isRichHtmlEmpty(html: string): boolean {
  const trimmed = (html || "").trim();
  if (!trimmed) return true;

  const textOnly = normalizeRichHtml(trimmed)
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();

  return textOnly.length === 0;
}

/** Compare editor HTML semantically for controlled-value sync */
export function richHtmlEquivalent(a: string, b: string): boolean {
  if (isRichHtmlEmpty(a) && isRichHtmlEmpty(b)) return true;
  return normalizeRichHtml(a || "") === normalizeRichHtml(b || "");
}

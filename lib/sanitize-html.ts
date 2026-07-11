import sanitizeHtmlLib from "sanitize-html";

const RICH_HTML_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "span",
] as const;

const RICH_HTML_ALLOWED_ATTR: Record<string, string[]> = {
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height"],
  span: ["class", "style"],
  p: ["class", "style"],
  h2: ["class", "style"],
  h3: ["class", "style"],
  blockquote: ["class", "style"],
  li: ["class", "style"],
  ul: ["class", "style"],
  ol: ["class", "style"],
};

/** Strip scripts, event handlers, and dangerous URLs from rich HTML. */
export function sanitizeHtml(html: string): string {
  if (!html?.trim()) return "";

  return sanitizeHtmlLib(html, {
    allowedTags: [...RICH_HTML_ALLOWED_TAGS],
    allowedAttributes: RICH_HTML_ALLOWED_ATTR,
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
  });
}

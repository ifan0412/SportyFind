import DOMPurify from "isomorphic-dompurify";

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

const RICH_HTML_ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "class",
  "style",
  "src",
  "alt",
  "title",
  "width",
  "height",
] as const;

/** Strip scripts, event handlers, and dangerous URLs from rich HTML. */
export function sanitizeHtml(html: string): string {
  if (!html?.trim()) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...RICH_HTML_ALLOWED_TAGS],
    ALLOWED_ATTR: [...RICH_HTML_ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target", "rel"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}

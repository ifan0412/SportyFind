/** Detect HTML vs legacy plain-text article bodies */
export function isHtmlBody(body: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(body.trim());
}

/** Strip HTML tags for search previews */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

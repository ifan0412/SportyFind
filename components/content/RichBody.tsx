import { isHtmlBody } from "@/lib/content/body";
import { normalizeRichHtml } from "@/lib/content/rich-html";

const richBodyClass = "rich-body max-w-none text-sm text-zinc-300 leading-relaxed";

export function RichBody({
  html,
  className = "",
  emptyText = "尚未填寫內容。",
}: {
  html: string | null | undefined;
  className?: string;
  emptyText?: string;
}) {
  const body = html?.trim() ?? "";
  if (!body) {
    return <p className={`text-sm text-zinc-500 ${className}`}>{emptyText}</p>;
  }

  if (isHtmlBody(body)) {
    return (
      <div
        className={`${richBodyClass} ${className}`}
        dangerouslySetInnerHTML={{ __html: normalizeRichHtml(body) }}
      />
    );
  }

  return (
    <p className={`text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap ${className}`}>
      {body}
    </p>
  );
}

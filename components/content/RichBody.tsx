import { isHtmlBody } from "@/lib/content/body";

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
        className={`prose prose-invert prose-sm max-w-none prose-p:text-zinc-300 prose-headings:text-white prose-a:text-blue-400 prose-img:rounded-xl ${className}`}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  }

  return (
    <p className={`text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap ${className}`}>
      {body}
    </p>
  );
}

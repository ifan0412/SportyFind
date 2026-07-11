"use client";

import { parseShareMessage } from "@/lib/share-payload";
import { SharePreviewCard } from "@/components/share/SharePreviewCard";

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export function MessageShareContent({ content }: { content: string }) {
  const share = parseShareMessage(content);
  if (share) {
    return <SharePreviewCard payload={share.payload} intro={share.intro} />;
  }

  const parts = content.split(URL_REGEX);
  return (
    <>
      {parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          return (
            <a
              key={`link-${index}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 underline break-all hover:text-blue-200"
            >
              {part}
            </a>
          );
        }
        return <span key={`text-${index}`}>{part}</span>;
      })}
    </>
  );
}

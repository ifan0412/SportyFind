"use client";

import { useMemo } from "react";
import { ShareMenu } from "@/components/share/ShareMenu";
import type { SharePayload } from "@/lib/share-payload";

interface ContentArticleShareProps {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  className?: string;
}

export function ContentArticleShare({
  slug,
  title,
  excerpt,
  coverImageUrl,
  className = "",
}: ContentArticleShareProps) {
  const payload = useMemo<SharePayload>(
    () => ({
      type: "content",
      id: slug,
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/content/${slug}`
          : `/content/${slug}`,
      title,
      subtitle: excerpt || undefined,
      imageUrl: coverImageUrl || undefined,
    }),
    [slug, title, excerpt, coverImageUrl]
  );

  return <ShareMenu payload={payload} label="分享文章" className={className} />;
}

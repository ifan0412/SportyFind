"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar } from "lucide-react";
import { normalizeCategories, normalizeSports } from "@/lib/content/constants";
import type { ContentPost } from "@/lib/types/content";
import { ContentBadges } from "@/components/content/ContentBadges";

export function ContentCard({ post }: { post: ContentPost }) {
  const date = post.published_at || post.created_at;
  const categories = normalizeCategories(post.categories);
  const sports = normalizeSports(post.sports);

  return (
    <Link
      href={`/content/${post.slug}`}
      className="group flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 shadow-lg hover:shadow-xl"
    >
      <div className="relative aspect-[16/9] bg-slate-800 overflow-hidden">
        {post.cover_image_url ? (
          <Image
            src={post.cover_image_url}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl bg-gradient-to-br from-slate-800 to-slate-900">
            📚
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[90%]">
          <ContentBadges categories={categories} sports={sports} size="xs" overlay />
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h2 className="text-base font-black text-white group-hover:text-blue-400 transition line-clamp-2 leading-snug">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed flex-1">{post.excerpt}</p>
        )}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/80">
          <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(date).toLocaleDateString("zh-HK", { year: "numeric", month: "short", day: "numeric" })}
          </span>
          <span className="text-xs font-black text-violet-400 flex items-center gap-1 group-hover:gap-2 transition-all">
            Read more <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";
import { CONTENT_CATEGORIES, getCategoryLabel } from "@/lib/content/constants";
import { isHtmlBody } from "@/lib/content/body";
import { SITE } from "@/lib/site";
import type { ContentLink, ContentPost } from "@/lib/types/content";
import { ArrowRight, Calendar, ExternalLink } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_posts")
    .select("title, meta_title, meta_description, excerpt, cover_image_url")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return { title: `文章未找到 | ${SITE.name}` };

  return {
    title: data.meta_title || `${data.title} | ${SITE.name}`,
    description: data.meta_description || data.excerpt || undefined,
    openGraph: {
      title: data.meta_title || data.title,
      description: data.meta_description || data.excerpt || undefined,
      images: data.cover_image_url ? [{ url: data.cover_image_url }] : undefined,
      type: "article",
    },
  };
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("content_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) notFound();

  const article = post as ContentPost;
  const links = (Array.isArray(article.links) ? article.links : []) as ContentLink[];
  const categoryMeta = CONTENT_CATEGORIES.find((c) => c.id === article.category);
  const published = article.published_at || article.created_at;
  const bodyIsHtml = isHtmlBody(article.body);
  const paragraphs = bodyIsHtml
    ? []
    : article.body
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

  return (
    <article className="bg-slate-950 min-h-screen text-zinc-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <BackButton label="返回知識庫" href="/content" />

        <header className="mt-6 mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {getCategoryLabel(article.category)}
            </span>
            {article.sport && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {article.sport}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-4">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed mb-4">{article.excerpt}</p>
          )}

          <time
            dateTime={published}
            className="text-xs text-zinc-500 font-bold flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            {new Date(published).toLocaleDateString("zh-HK", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </header>

        {article.cover_image_url && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-slate-800 mb-10 shadow-2xl">
            <Image
              src={article.cover_image_url}
              alt={article.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        {bodyIsHtml ? (
          <div
            className="content-article-body prose prose-invert max-w-none text-[15px] sm:text-base leading-relaxed text-zinc-300"
            dangerouslySetInnerHTML={{ __html: article.body }}
          />
        ) : (
          <div className="prose prose-invert max-w-none space-y-5 text-[15px] sm:text-base leading-relaxed text-zinc-300">
            {paragraphs.map((para, i) => (
              <p key={i} className="whitespace-pre-wrap">{para}</p>
            ))}
          </div>
        )}

        {links.length > 0 && (
          <section className="mt-12 pt-8 border-t border-slate-800">
            <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4">相關連結</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {links.map((link, i) => {
                const isExternal = link.url.startsWith("http");
                const href = link.url.startsWith("/") || isExternal ? link.url : `/${link.url}`;
                return (
                  <Link
                    key={i}
                    href={href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/80 transition group"
                  >
                    <span className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                      {link.label}
                    </span>
                    {isExternal ? (
                      <ExternalLink className="w-4 h-4 text-zinc-500 shrink-0" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {categoryMeta && (
          <div className="mt-10 p-5 rounded-2xl bg-blue-950/30 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-blue-300 font-bold">想在 {categoryMeta.label} 專區行動？</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">立即探索 SportyFind 相關功能</p>
            </div>
            <Link
              href={categoryMeta.href}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition shrink-0"
            >
              前往 {categoryMeta.label} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

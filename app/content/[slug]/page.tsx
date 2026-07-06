import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";
import { getCategoryMeta, normalizeCategories, normalizeSports } from "@/lib/content/constants";
import { isHtmlBody } from "@/lib/content/body";
import { SITE } from "@/lib/site";
import type { ContentLink, ContentPost } from "@/lib/types/content";
import { ContentBadges } from "@/components/content/ContentBadges";
import { ArrowRight, Calendar, Clock, ExternalLink } from "lucide-react";

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

  if (!data) return { title: `Article not found | ${SITE.name}` };

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

function estimateReadMinutes(body: string): number {
  const text = body.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
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
  const categories = normalizeCategories(article.categories);
  const sports = normalizeSports(article.sports);
  const categoryMetas = categories.map(getCategoryMeta).filter(Boolean);
  const published = article.published_at || article.created_at;
  const bodyIsHtml = isHtmlBody(article.body);
  const readMin = estimateReadMinutes(article.body);
  const paragraphs = bodyIsHtml
    ? []
    : article.body
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

  return (
    <article className="bg-slate-950 min-h-screen text-zinc-200">
      {/* Hero banner */}
      {article.cover_image_url ? (
        <div className="relative w-full min-h-[320px] sm:min-h-[420px] flex items-end">
          <Image
            src={article.cover_image_url}
            alt={article.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 to-transparent" />

          <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-24">
            <BackButton label="Back to Sports Tips" href="/content" />

            <div className="flex flex-wrap gap-2 mb-4 mt-4">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30 backdrop-blur-sm">
                Sports Tips
              </span>
              <ContentBadges categories={categories} sports={sports} overlay />
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.1] mb-4 max-w-3xl drop-shadow-lg">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed mb-5 max-w-2xl drop-shadow">
                {article.excerpt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-bold">
              <time dateTime={published} className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(published).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {readMin} min read
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <BackButton label="Back to Sports Tips" href="/content" />
          <header className="mt-6 mb-8">
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-4">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="text-base sm:text-lg text-zinc-400 leading-relaxed mb-4">{article.excerpt}</p>
            )}
          </header>
        </div>
      )}

      {/* Article body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {bodyIsHtml ? (
          <div
            className="content-article-body prose prose-invert max-w-none text-[15px] sm:text-[17px] leading-relaxed text-zinc-300"
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
          <section className="mt-14 pt-10 border-t border-slate-800">
            <h2 className="text-sm font-black text-white uppercase tracking-wider mb-5">Related links</h2>
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
                    className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-violet-500/40 hover:bg-slate-800/80 transition group"
                  >
                    <span className="text-sm font-bold text-white group-hover:text-violet-300 transition">
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

        {categoryMetas.length > 0 && (
          <div className="mt-10 space-y-3">
            <p className="text-xs text-violet-300 font-bold">Ready to take action?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryMetas.map((meta) => meta && (
                <Link
                  key={meta.id}
                  href={meta.href}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-br from-violet-950/40 to-slate-900/60 border border-violet-500/20 hover:border-violet-400/40 transition group"
                >
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-violet-200 transition">
                      {meta.labelEn}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Explore on SportyFind</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";
import { getCategoryMeta, normalizeCategories, normalizeSports } from "@/lib/content/constants";
import { isHtmlBody } from "@/lib/content/body";
import { sanitizeRichHtml } from "@/lib/content/rich-html";
import { SITE } from "@/lib/site";
import type { ContentLink, ContentPost } from "@/lib/types/content";
import { ContentBadges } from "@/components/content/ContentBadges";
import { ARTICLE_PAGE_MAX_WIDTH } from "@/lib/listing-sections";
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

function ArticleIntroHeader({
  title,
  excerpt,
  published,
  readMin,
  categories,
  sports,
  overlay = false,
}: {
  title: string;
  excerpt?: string | null;
  published: string;
  readMin: number;
  categories: string[];
  sports: string[];
  overlay?: boolean;
}) {
  return (
    <>
      <BackButton label="返回運動貼士" href="/content" />

      <div className={`flex flex-wrap gap-2 mb-4 ${overlay ? "mt-4" : "mt-3"}`}>
        <span
          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30 ${
            overlay ? "backdrop-blur-sm" : ""
          }`}
        >
          運動貼士
        </span>
        <ContentBadges categories={categories} sports={sports} overlay={overlay} />
      </div>

      <h1
        className={`text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-4 max-w-3xl ${
          overlay ? "drop-shadow-lg" : ""
        }`}
      >
        {title}
      </h1>

      {excerpt && (
        <p
          className={`text-sm sm:text-base leading-relaxed mb-5 max-w-2xl ${
            overlay ? "text-zinc-300 drop-shadow" : "text-zinc-400"
          }`}
        >
          {excerpt}
        </p>
      )}

      <div className={`flex flex-wrap items-center gap-4 text-xs font-bold ${overlay ? "text-zinc-400" : "text-zinc-500"}`}>
        <time dateTime={published} className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(published).toLocaleDateString("zh-HK", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          約 {readMin} 分鐘閱讀
        </span>
      </div>
    </>
  );
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
    <article className="bg-slate-950 min-h-screen text-zinc-200 font-sans pb-24">
      {article.cover_image_url ? (
        <>
          {/* Mobile: banner image + readable header below (no clipped overlay). */}
          <div className="md:hidden">
            <div className="relative w-full aspect-[16/9] max-h-[220px] overflow-hidden bg-slate-900">
              <Image
                src={article.cover_image_url}
                alt={article.title}
                fill
                className="object-cover object-center"
                priority
                sizes="100vw"
              />
            </div>
            <div className={`${ARTICLE_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 pb-2 pt-4`}>
              <ArticleIntroHeader
                title={article.title}
                excerpt={article.excerpt}
                published={published}
                readMin={readMin}
                categories={categories}
                sports={sports}
              />
            </div>
          </div>

          {/* Desktop: cinematic overlay hero. */}
          <div className="relative hidden w-full md:block md:aspect-[16/9] md:max-h-[480px] overflow-hidden bg-slate-900">
            <Image
              src={article.cover_image_url}
              alt={article.title}
              fill
              className="object-cover object-center"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 to-transparent" />

            <div className={`relative z-10 w-full ${ARTICLE_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 pb-8 pt-24`}>
              <ArticleIntroHeader
                title={article.title}
                excerpt={article.excerpt}
                published={published}
                readMin={readMin}
                categories={categories}
                sports={sports}
                overlay
              />
            </div>
          </div>
        </>
      ) : (
        <div className={`${ARTICLE_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 py-6 md:py-8`}>
          <ArticleIntroHeader
            title={article.title}
            excerpt={article.excerpt}
            published={published}
            readMin={readMin}
            categories={categories}
            sports={sports}
          />
        </div>
      )}

      <div className={`${ARTICLE_PAGE_MAX_WIDTH} mx-auto px-4 sm:px-6 pt-6 pb-8 md:py-10`}>
        {bodyIsHtml ? (
          <div
            className="content-article-body rich-body max-w-none text-[15px] sm:text-[17px] leading-relaxed text-zinc-300"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(article.body) }}
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
            <h2 className="text-sm font-black text-white uppercase tracking-wider mb-5">相關連結</h2>
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
            <p className="text-xs text-violet-300 font-bold">想在平台上採取行動？</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryMetas.map((meta) => meta && (
                <Link
                  key={meta.id}
                  href={meta.href}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-br from-violet-950/40 to-slate-900/60 border border-violet-500/20 hover:border-violet-400/40 transition group"
                >
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-violet-200 transition">
                      {meta.label}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">前往 SportyFind 探索</p>
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

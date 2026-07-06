import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { SITE } from "@/lib/site";

interface LegalDocumentProps {
  title: string;
  titleEn?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalDocument({
  title,
  titleEn,
  lastUpdated = SITE.lastUpdated,
  children,
}: LegalDocumentProps) {
  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton label="返回首頁" />

        <header className="mt-6 mb-10 border-b border-slate-800 pb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
            {SITE.name} Legal
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h1>
          {titleEn && (
            <p className="text-sm text-zinc-500 mt-1 font-medium">{titleEn}</p>
          )}
          <p className="text-xs text-zinc-500 mt-4">
            最後更新 Last updated: {lastUpdated}
          </p>
        </header>

        <article className="space-y-8 text-sm sm:text-[15px] leading-relaxed text-zinc-300 [&_h2]:text-base [&_h2]:sm:text-lg [&_h2]:font-black [&_h2]:text-white [&_h2]:mt-2 [&_h2]:mb-3 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-zinc-200 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:text-zinc-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-zinc-300 [&_a]:text-blue-400 [&_a]:hover:underline">
          {children}
        </article>

        <footer className="mt-14 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs font-bold text-zinc-500">
          <Link href="/privacy" className="hover:text-white transition">私隱政策</Link>
          <Link href="/cookies" className="hover:text-white transition">Cookie 政策</Link>
          <Link href="/terms" className="hover:text-white transition">服務條款</Link>
        </footer>
      </div>
    </div>
  );
}

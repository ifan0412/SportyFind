import Link from "next/link";
import { SITE } from "@/lib/site";

const legalLinks = [
  { href: "/privacy", label: "私隱政策" },
  { href: "/cookies", label: "Cookie 政策" },
  { href: "/terms", label: "服務條款" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="md:hidden border-t border-slate-800/60 bg-slate-950 mt-auto mb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] font-bold text-zinc-500">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-zinc-300 transition">
                {link.label}
              </Link>
            ))}
            <span className="text-zinc-700" aria-hidden>
              ·
            </span>
            <Link href="/feedback" className="hover:text-zinc-300 transition">
              意見回饋
            </Link>
            <span className="text-zinc-700" aria-hidden>
              ·
            </span>
            <a href={`mailto:${SITE.supportEmail}`} className="hover:text-blue-400 transition">
              {SITE.supportEmail}
            </a>
          </div>
          <p className="text-center text-[10px] text-zinc-600 mt-2">
            © {year} {SITE.name}
          </p>
        </div>
      </footer>

      <footer className="hidden md:block border-t border-slate-800/80 bg-slate-950 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <p className="text-lg font-black text-white">{SITE.name}</p>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
                {SITE.tagline}。我們重視您的私隱，並以透明方式處理個人資料。
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">探索</p>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/content"
                    className="text-sm text-zinc-400 hover:text-white transition font-medium"
                  >
                    運動貼士
                  </Link>
                </li>
                <li>
                  <Link
                    href="/feedback"
                    className="text-sm text-zinc-400 hover:text-white transition font-medium"
                  >
                    意見回饋
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">法律文件</p>
              <ul className="space-y-2">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 hover:text-white transition font-medium"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">聯絡</p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  私隱查詢：{" "}
                  <a href={`mailto:${SITE.contactEmail}`} className="text-blue-400 hover:underline">
                    {SITE.contactEmail}
                  </a>
                </li>
                <li>
                  一般支援：{" "}
                  <a href={`mailto:${SITE.supportEmail}`} className="text-blue-400 hover:underline">
                    {SITE.supportEmail}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] text-zinc-600">
            <p>© {year} {SITE.name}。版權所有。</p>
            <p className="text-zinc-600">營運地區：{SITE.region}</p>
          </div>
        </div>
      </footer>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  Menu, Users, GraduationCap, Zap, X, LogOut, Shield, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

// 💡 只有這四個導覽項目：Players, Coaches, Teams, Physio (完全沒有 Home 或 Events)
const navLinks = [
  { href: "/network", label: "Players", icon: Users },
  { href: "/coaches",   label: "Coaches", icon: GraduationCap },
  { 
    href: "/team",    
    label: "Teams",   
    icon: Shield,
    subLinks: [
      { href: "/team?sport=Basketball", label: "🏀 籃球 (Basketball)" },
      { href: "/team?sport=Volleyball", label: "🏐 排球 (Volleyball)" },
      { href: "/team?sport=Tennis",     label: "🎾 網球 (Tennis)" },
      { href: "/team",                  label: "查看所有球隊 →" },
    ]
  },
  { href: "/physio",  label: "Physio",  icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md shadow-sm">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* 💡 Logo (同時作為回首頁的按鈕) */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80" onClick={() => setMobileOpen(false)}>
          <span className="flex size-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <Zap className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-black tracking-tight text-white sm:text-base">
            SPORTY<span className="text-blue-400">FIND</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon, subLinks }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            
            return (
              <li key={href} className="relative group">
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-4 text-sm font-medium transition-colors",
                    isActive ? "text-blue-400" : "text-slate-400 hover:text-white",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                  {subLinks && <span className="text-[10px] ml-1 opacity-50 group-hover:opacity-100 transition-opacity">▼</span>}
                </Link>

                {/* Desktop Dropdown */}
                {subLinks && (
                  <div className="absolute top-full left-0 mt-0 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                    {subLinks.map((sub) => (
                      <Link 
                        key={sub.href} 
                        href={sub.href} 
                        className={`block px-4 py-3 text-sm font-bold transition hover:bg-slate-800 ${sub.href === '/team' ? 'text-blue-400 border-t border-slate-800 mt-1' : 'text-zinc-400 hover:text-white'}`}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}

          {/* Auth button */}
          {user ? (
            <li className="flex items-center gap-2 ml-2">
              <Link href="/profile" className="text-sm font-medium text-blue-400 hover:text-white transition-colors">ME</Link>
              <button onClick={handleLogout} className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                <LogOut className="size-4" /> 登出
              </button>
            </li>
          ) : (
            <li>
              <Link href="/auth" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                登入
              </Link>
            </li>
          )}
        </ul>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-800 bg-slate-950 md:hidden absolute w-full max-h-[85vh] overflow-y-auto shadow-2xl">
          <ul className="mx-auto max-w-6xl space-y-2 px-4 py-4 sm:px-6">
            {navLinks.map(({ href, label, icon: Icon, subLinks }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href} className="space-y-1">
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors",
                      isActive ? "bg-blue-600/15 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    )}
                    onClick={() => !subLinks && setMobileOpen(false)}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>

                  {/* Mobile Dropdown */}
                  {subLinks && (
                    <div className="pl-10 pr-3 pb-2 space-y-1 border-l-2 border-slate-800 ml-5">
                      {subLinks.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={`block py-2.5 text-sm font-medium transition-colors ${sub.href === '/team' ? 'text-blue-400' : 'text-zinc-500 hover:text-white'}`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
            <div className="h-px bg-slate-800 my-4" />
            {user ? (
              <>
                <li><Link href="/profile" className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-blue-400" onClick={() => setMobileOpen(false)}>ME</Link></li>
                <li><button onClick={() => { setMobileOpen(false); handleLogout(); }} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><LogOut className="size-4" /> 登出</button></li>
              </>
            ) : (
              <li><Link href="/auth" className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white" onClick={() => setMobileOpen(false)}>登入</Link></li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
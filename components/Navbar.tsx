"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  CalendarDays, Menu, UserCircle, Users, GraduationCap, Zap, X, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/events",          label: "Events",  icon: CalendarDays  },
  { href: "/network/players", label: "Players", icon: Users         },
  { href: "/coaches",         label: "Coaches", icon: GraduationCap },
  { href: "/profile",         label: "Profile", icon: UserCircle    },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // ✅ FIXED: moved inside the component
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md shadow-sm">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <Zap className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-black tracking-tight text-white sm:text-base">
            SPORTY<span className="text-blue-400">FIND</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-blue-600/15 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}

          {/* Auth button */}
          {user ? (
            <li className="flex items-center gap-2 ml-2">
              <Link
                href="/profile"
                className="text-sm font-medium text-blue-400 hover:text-white transition-colors"
              >
                ME
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <LogOut className="size-4" />
                登出
              </button>
            </li>
          ) : (
            <li>
              <Link
                href="/auth/login"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                登入
              </Link>
            </li>
          )}
        </ul>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-800 bg-slate-950 md:hidden">
          <ul className="mx-auto max-w-6xl space-y-1 px-4 py-3 sm:px-6">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive ? "bg-blue-600/15 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </li>
              );
            })}

            {/* Mobile auth */}
            {user ? (
              <>
                <li>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-blue-400"
                    onClick={() => setMobileOpen(false)}
                  >
                    ME
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <LogOut className="size-4" />
                    登出
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth/login"
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  登入
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
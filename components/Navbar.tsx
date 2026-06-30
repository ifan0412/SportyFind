"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Menu,
  Trophy,
  UserCircle,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/people", label: "People", icon: Users },
  { href: "/coaches", label: "Coaches", icon: Trophy },
  { href: "/profile", label: "Profile", icon: UserCircle },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-pro-slate-200 bg-pro-slate-50 shadow-sm">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-900 transition-colors hover:text-blue-700"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-pro-blue-700 text-white">
            <Trophy className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            Pro Sports Network
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-pro-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-pro-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-pro-slate-100 hover:text-slate-900 md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-pro-slate-200 bg-pro-slate-50 md:hidden">
          <ul className="mx-auto max-w-6xl space-y-1 px-4 py-3 sm:px-6">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-pro-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-pro-slate-50 hover:text-slate-900",
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </header>
  );
}

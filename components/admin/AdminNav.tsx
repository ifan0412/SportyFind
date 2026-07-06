"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, FileText, Users } from "lucide-react";

const adminNav = [
  { href: "/admin/analytics", label: "數據分析", icon: BarChart3 },
  { href: "/admin/content", label: "內容 CMS", icon: FileText },
  { href: "/admin/users", label: "用戶管理", icon: Users },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 mb-8 p-1.5 rounded-2xl bg-slate-900/60 border border-slate-800">
      {adminNav.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href === "/admin/analytics" && pathname === "/admin") ||
          pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition",
              active
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "text-zinc-400 hover:text-white hover:bg-slate-800 border border-transparent"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

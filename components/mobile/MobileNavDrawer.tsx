"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { navLinks } from "@/lib/nav-links";
import { isSiteAdmin } from "@/lib/admin";
import { ProfileNavMenu, type ProfileNavData } from "@/components/NavbarProfileMenu";
import { LOGIN_DRAWER_LINK_CLASS } from "@/lib/login-button-styles";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  profileNav: ProfileNavData;
  userEmail?: string | null;
  onLogout: () => void;
  isGuest?: boolean;
}

export function MobileNavDrawer({
  open,
  onClose,
  profileNav,
  userEmail,
  onLogout,
  isGuest = false,
}: MobileNavDrawerProps) {
  const pathname = usePathname();
  const showAdmin = isSiteAdmin(userEmail);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 top-14 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-[90] md:hidden">
      <button
        type="button"
        aria-label="關閉選單"
        className="absolute inset-0 bg-slate-950/80"
        onClick={onClose}
      />
      <div className="absolute inset-0 bg-slate-950 border-t border-slate-800 overflow-y-auto shadow-2xl">
        <ul className="mx-auto w-full space-y-2 px-4 py-6 sm:px-6">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const hrefPath = href.split("?")[0];
            const isActive = pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors",
                    isActive
                      ? "bg-blue-600/15 text-blue-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                  onClick={onClose}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              </li>
            );
          })}

          {showAdmin && (
            <li>
              <Link
                href="/admin/analytics"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-red-600/15 text-red-400"
                    : "text-red-500/80 hover:bg-slate-800 hover:text-red-400"
                )}
                onClick={onClose}
              >
                <Settings2 className="size-4" /> 網站管理 Admin
              </Link>
            </li>
          )}

          {!isGuest && (
            <>
              <div className="h-px bg-slate-800 my-4" />

              <ProfileNavMenu
                pathname={pathname}
                profileNav={profileNav}
                variant="mobile-menu"
                onNavigate={onClose}
              />
              <li>
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <LogOut className="size-4" /> 登出
                </button>
              </li>
            </>
          )}

          {isGuest && (
            <>
              <div className="h-px bg-slate-800 my-4" />
              <li>
                <Link
                  href="/auth"
                  className={LOGIN_DRAWER_LINK_CLASS}
                  onClick={onClose}
                >
                  <LogIn className="size-4" /> 登入 / 註冊
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

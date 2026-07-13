"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Menu, MessageSquare, User, X, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/SupabaseProvider";
import { useProfileNav } from "@/lib/hooks/useProfileNav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeSupabaseQuery } from "@/lib/supabase/safe-query";
import { loadConversationSummaries, totalUnreadCount } from "@/lib/chat-summaries";
import { MobileNavDrawer } from "@/components/mobile/MobileNavDrawer";
import {
  LOGIN_MOBILE_NAV_ACTIVE_CLASS,
  LOGIN_MOBILE_NAV_IDLE_CLASS,
} from "@/lib/login-button-styles";

const HIDDEN_PREFIXES = ["/auth", "/gate"];

function NavButton({
  href,
  label,
  active,
  onClick,
  children,
  badge,
  ariaLabel,
  accent = "default",
}: {
  href?: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  badge?: number;
  ariaLabel?: string;
  accent?: "default" | "login";
}) {
  const className = cn(
    "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0 py-0.5 text-[11px] leading-none font-bold transition-colors whitespace-nowrap",
    accent === "login"
      ? active
        ? LOGIN_MOBILE_NAV_ACTIVE_CLASS
        : LOGIN_MOBILE_NAV_IDLE_CLASS
      : active
        ? "text-blue-400"
        : "text-slate-400"
  );

  const content = (
    <>
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        {children}
        {badge != null && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="mt-0.5 max-w-[4.75rem] truncate px-0.5 text-center">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={ariaLabel ?? label}
    >
      {content}
    </button>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const profileNav = useProfileNav(user?.id);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dmUnread, setDmUnread] = useState(0);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const hidden =
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const pinToViewportBottom = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav.style.position = "fixed";
    nav.style.top = "auto";
    nav.style.bottom = "0";
    nav.style.left = "0";
    nav.style.right = "0";
    nav.style.transform = "none";
    nav.style.margin = "0";
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || hidden) return;

    pinToViewportBottom();

    const vv = window.visualViewport;
    const onViewportChange = () => pinToViewportBottom();

    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    window.addEventListener("resize", onViewportChange);

    return () => {
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [mounted, hidden, pinToViewportBottom]);

  const refreshDmUnread = useCallback(async () => {
    if (!user?.id) {
      setDmUnread(0);
      return;
    }
    const { data: friendships } = await safeSupabaseQuery(
      supabase
        .from("friendships")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    );

    const peerIds = (friendships ?? []).map((f) =>
      f.sender_id === user.id ? f.receiver_id : f.sender_id
    );
    if (peerIds.length === 0) {
      setDmUnread(0);
      return;
    }
    const summaries = await loadConversationSummaries(supabase, user.id, peerIds);
    setDmUnread(totalUnreadCount(summaries));
  }, [supabase, user?.id]);

  useEffect(() => {
    refreshDmUnread().catch(() => {});
    const onSync = () => refreshDmUnread().catch(() => {});
    window.addEventListener("chat-message-sync", onSync);
    return () => window.removeEventListener("chat-message-sync", onSync);
  }, [refreshDmUnread]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!mounted || hidden) return null;

  const isAuthenticated = Boolean(user);
  const isHome = pathname === "/";
  const isEvents = isAuthenticated
    ? pathname === "/events/my" || pathname.startsWith("/events/my/")
    : pathname === "/events" || pathname.startsWith("/events/");
  const isInbox = pathname === "/inbox" || pathname.startsWith("/inbox/");
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const isAuth = pathname === "/auth" || pathname.startsWith("/auth/");

  const chrome = (
    <>
      <nav
        ref={navRef}
        id="mobile-bottom-nav"
        aria-label="主要導覽"
        className="mobile-bottom-nav-root md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex h-14 items-center px-0.5">
          <NavButton href="/" label="首頁" active={isHome}>
            <Home className="h-[18px] w-[18px]" />
          </NavButton>

          {isAuthenticated ? (
            <>
              <NavButton href="/events/my" label="我的活動" active={isEvents}>
                <Calendar className="h-[18px] w-[18px]" />
              </NavButton>
              <NavButton
                label={menuOpen ? "關閉" : "選單"}
                active={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                ariaLabel={menuOpen ? "關閉選單" : "開啟選單"}
              >
                {menuOpen ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-white shadow-md">
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                ) : (
                  <Menu className="h-[18px] w-[18px]" />
                )}
              </NavButton>
              <NavButton href="/inbox" label="訊息" active={isInbox} badge={dmUnread}>
                <MessageSquare className="h-[18px] w-[18px]" />
              </NavButton>
              <NavButton href="/profile" label="我的" active={isProfile}>
                <User className="h-[18px] w-[18px]" />
              </NavButton>
            </>
          ) : (
            <>
              <NavButton href="/events" label="賽事/活動" active={isEvents}>
                <Calendar className="h-[18px] w-[18px]" />
              </NavButton>
              <NavButton
                label={menuOpen ? "關閉" : "選單"}
                active={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                ariaLabel={menuOpen ? "關閉選單" : "開啟選單"}
              >
                {menuOpen ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-white shadow-md">
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                ) : (
                  <Menu className="h-[18px] w-[18px]" />
                )}
              </NavButton>
              <NavButton href="/auth" label="登入" active={isAuth} accent="login">
                <LogIn className="h-[18px] w-[18px]" />
              </NavButton>
            </>
          )}
        </div>
      </nav>

      <MobileNavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        profileNav={profileNav}
        userEmail={user?.email}
        onLogout={() => signOut()}
        isGuest={!isAuthenticated}
      />
    </>
  );

  return createPortal(chrome, document.body);
}

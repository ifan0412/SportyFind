"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Menu, MessageSquare, User, X, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/SupabaseProvider";
import { useProfileNav } from "@/lib/hooks/useProfileNav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loadConversationSummaries, totalUnreadCount } from "@/lib/chat-summaries";
import { MobileNavDrawer } from "@/components/mobile/MobileNavDrawer";

const HIDDEN_PREFIXES = ["/auth", "/gate"];

function NavButton({
  href,
  label,
  active,
  onClick,
  children,
  badge,
  ariaLabel,
}: {
  href?: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  badge?: number;
  ariaLabel?: string;
}) {
  const className = cn(
    "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition-colors",
    active ? "text-blue-400" : "text-slate-400"
  );

  const content = (
    <>
      <span className="relative flex items-center justify-center w-8 h-8">
        {children}
        {badge != null && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span>{label}</span>
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

  const hidden =
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const refreshDmUnread = useCallback(async () => {
    if (!user?.id) {
      setDmUnread(0);
      return;
    }
    const { data: friendships } = await supabase
      .from("friendships")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

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

  if (hidden) return null;

  const isAuthenticated = Boolean(user);
  const isHome = pathname === "/";
  const isEvents = isAuthenticated
    ? pathname === "/events/my" || pathname.startsWith("/events/my/")
    : pathname === "/events" || pathname.startsWith("/events/");
  const isInbox = pathname === "/inbox" || pathname.startsWith("/inbox/");
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const isAuth = pathname === "/auth" || pathname.startsWith("/auth/");

  return (
    <>
      <nav
        aria-label="主要導覽"
        className="fixed bottom-0 inset-x-0 z-[100] md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-stretch h-16 px-1">
          <NavButton href="/" label="首頁" active={isHome}>
            <Home className="w-5 h-5" />
          </NavButton>

          {isAuthenticated ? (
            <>
              <NavButton href="/events/my" label="我的賽事/活動" active={isEvents}>
                <Calendar className="w-5 h-5" />
              </NavButton>
              <NavButton
                label={menuOpen ? "關閉" : "選單"}
                active={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                ariaLabel={menuOpen ? "關閉選單" : "開啟選單"}
              >
                {menuOpen ? (
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-white shadow-md">
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </NavButton>
              <NavButton href="/inbox" label="訊息" active={isInbox} badge={dmUnread}>
                <MessageSquare className="w-5 h-5" />
              </NavButton>
              <NavButton href="/profile" label="我的" active={isProfile}>
                <User className="w-5 h-5" />
              </NavButton>
            </>
          ) : (
            <>
              <NavButton href="/events" label="賽事/活動" active={isEvents}>
                <Calendar className="w-5 h-5" />
              </NavButton>
              <NavButton
                label={menuOpen ? "關閉" : "選單"}
                active={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                ariaLabel={menuOpen ? "關閉選單" : "開啟選單"}
              >
                {menuOpen ? (
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-white shadow-md">
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </NavButton>
              <NavButton href="/auth" label="登入" active={isAuth}>
                <LogIn className="w-5 h-5" />
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
}

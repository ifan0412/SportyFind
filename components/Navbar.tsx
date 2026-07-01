"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Menu, Users, GraduationCap, Zap, X, LogOut, Shield, Activity, Bell, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";

// ── Nav links ──────────────────────────────────────────────────────────────
const navLinks = [
  { href: "/network", label: "Network", icon: Users }, // 
  { href: "/coaches", label: "Coaches", icon: GraduationCap },
  {
    href: "/team",
    label: "Sports Team", //
    icon: Shield,
    subLinks: [
      { href: "/team?sport=Basketball", label: "🏀 籃球 (Basketball)" },
      { href: "/team?sport=Volleyball", label: "🏐 排球 (Volleyball)" },
      { href: "/team?sport=Tennis",     label: "🎾 網球 (Tennis)" },
      { href: "/team",                  label: "查看所有群組 →" }, // ✅ 修改：球隊 -> 群組
    ],
  },
  { href: "/physio", label: "Physio", icon: Activity },
];

// ── Types ──────────────────────────────────────────────────────────────────
// Extensible: add more union members as the app grows
// e.g. | "match_invite" | "team_announcement"
export interface Notification {
  id: string;
  type: "friend_request" | "friend_accepted";
  is_read: boolean;
  created_at: string;
  friendship_id: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ── NotificationBell ───────────────────────────────────────────────────────
// Isolated as a proper component so that:
//   1. Each call site gets its own ref → no shared-ref DOM conflict
//   2. Each call site gets its own outside-click listener
//   3. Navbar stays lean — all bell logic lives here
interface NotificationBellProps {
  notifications: Notification[];
  onMarkAllRead: () => Promise<void>;
  onAccept: (notif: Notification) => Promise<void>;
  onReject: (notif: Notification) => Promise<void>;
  isProcessing: (id: string) => boolean;
}

function NotificationBell({
  notifications,
  onMarkAllRead,
  onAccept,
  onReject,
  isProcessing,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  // Each instance of this component creates its own ref
  // so desktop and mobile never share a DOM node reference
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Outside-click — scoped to this component's ref only
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleToggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      await onMarkAllRead();
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        aria-label="通知"
        className="relative flex items-center justify-center w-9 h-9 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">

          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-black text-white">通知</span>
            <span className="text-xs text-zinc-500">{notifications.length} 則</span>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-sm font-bold">
                暫無通知
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 transition-colors ${!notif.is_read ? "bg-blue-500/5" : ""}`}
                >
                  {/* Avatar + message */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{
                        backgroundImage: notif.sender?.avatar_url
                          ? `url(${notif.sender.avatar_url})`
                          : "none",
                        backgroundSize:     "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {!notif.sender?.avatar_url && (
                        <span className="text-xs font-black text-zinc-500">
                          {notif.sender?.full_name?.[0] ?? "?"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 font-bold leading-snug">
                        {notif.type === "friend_request" && (
                          <>
                            <span className="text-white">
                              {notif.sender?.full_name ?? "某人"}
                            </span>{" "}
                            向你發送了好友請求
                          </>
                        )}
                        {notif.type === "friend_accepted" && (
                          <>
                            <span className="text-white">
                              {notif.sender?.full_name ?? "某人"}
                            </span>{" "}
                            接受了你的好友請求 🎉
                          </>
                        )}
                      </p>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(notif.created_at).toLocaleString("zh-HK", {
                          month:  "short",
                          day:    "numeric",
                          hour:   "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Actions — friend_request */}
                  {notif.type === "friend_request" && notif.friendship_id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAccept(notif)}
                        disabled={isProcessing(notif.id)}
                        className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black transition"
                      >
                        {isProcessing(notif.id) ? "處理中..." : "✓ 接受"}
                      </button>
                      <button
                        onClick={() => onReject(notif)}
                        disabled={isProcessing(notif.id)}
                        className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-red-400 text-xs font-black transition"
                      >
                        {isProcessing(notif.id) ? "處理中..." : "✕ 拒絕"}
                      </button>
                    </div>
                  )}

                  {/* Actions — friend_accepted */}
                  {notif.type === "friend_accepted" && notif.sender?.id && (
                    <Link
                      href={`/p/${notif.sender.id}`}
                      onClick={() => setOpen(false)}
                      className="block text-center py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-black transition"
                    >
                      查看檔案
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer — always points to Profile friends tab,
              never to a standalone /friends page */}
          <div className="border-t border-slate-800 px-4 py-3">
            <Link
              href="/profile?tab=friends"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-black text-blue-400 hover:text-blue-300 transition"
            >
              管理所有好友請求 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────
export function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser]             = useState<SupabaseAuthUser | null>(null);
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null); // ✅ 新增：用來存放使用者頭像
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Double-click protection
  const processingIds = useRef<Set<string>>(new Set());
  const [processingSet, setProcessingSet] = useState<Set<string>>(new Set());

  const isProcessing = (id: string) => processingSet.has(id);
  const startProcessing = (id: string) => {
    processingIds.current.add(id);
    setProcessingSet(new Set(processingIds.current));
  };
  const stopProcessing = (id: string) => {
    processingIds.current.delete(id);
    setProcessingSet(new Set(processingIds.current));
  };

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ), []);

  // ── Fetch notifications & Profile DP ──────────────────────────────────────
  // ✅ 更新：不僅抓取通知，同時抓取使用者的 avatar_url
  const fetchProfileAndNotifs = useCallback(async (uid: string) => {
    const [notifRes, profileRes] = await Promise.all([
      supabase
        .from("notifications")
        .select(`
          id, type, is_read, created_at, friendship_id,
          sender:sender_id (id, full_name, avatar_url)
        `)
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", uid)
        .single()
    ]);

    if (notifRes.data) setNotifications(notifRes.data as unknown as Notification[]);
    if (profileRes.data?.avatar_url) setAvatarUrl(profileRes.data.avatar_url);
  }, [supabase]);

  // ── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      if (data.user) await fetchProfileAndNotifs(data.user.id);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (event === "SIGNED_IN" && session?.user) {
          await fetchProfileAndNotifs(session.user.id);
        }
        if (event === "SIGNED_OUT") {
          setNotifications([]);
          setAvatarUrl(null); // ✅ 登出時清空頭像
        }
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") router.refresh();
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router, fetchProfileAndNotifs]);

  // ── Realtime: new notification INSERT ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("navbar-notif-realtime")
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const { data: newNotif } = await supabase
            .from("notifications")
            .select(`
              id, type, is_read, created_at, friendship_id,
              sender:sender_id (id, full_name, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single();

          if (newNotif) {
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif as unknown as Notification, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, supabase]);

  // ── Mark all read (optimistic first, then persist) ───────────────────────
  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id) return;
    // Optimistic: update UI immediately
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    // Persist in background
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [supabase, user?.id]);

  // ── Accept ───────────────────────────────────────────────────────────────
  const handleAccept = useCallback(async (notif: Notification) => {
    if (!notif.friendship_id || !user?.id || isProcessing(notif.id)) return;
    startProcessing(notif.id);
    try {
      const [updateRes, insertRes] = await Promise.all([
        supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", notif.friendship_id),
        supabase.from("notifications").insert({
          user_id:       notif.sender?.id,
          sender_id:     user.id,
          type:          "friend_accepted",
          friendship_id: notif.friendship_id,
        }),
      ]);
      if (updateRes.error) throw updateRes.error;
      if (insertRes.error) throw insertRes.error;
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    } catch (err) {
      console.error("handleAccept:", err);
    } finally {
      stopProcessing(notif.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user?.id, processingSet]);

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleReject = useCallback(async (notif: Notification) => {
    if (!notif.friendship_id || isProcessing(notif.id)) return;
    startProcessing(notif.id);
    try {
      const [deleteF, deleteN] = await Promise.all([
        supabase.from("friendships").delete().eq("id", notif.friendship_id),
        supabase.from("notifications").delete().eq("id", notif.id),
      ]);
      if (deleteF.error) throw deleteF.error;
      if (deleteN.error) throw deleteN.error;
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    } catch (err) {
      console.error("handleReject:", err);
    } finally {
      stopProcessing(notif.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, processingSet]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNotifications([]);
    setAvatarUrl(null);
    router.push("/");
    router.refresh();
  };

  // Shared props object — avoids repeating the same five props twice below
  const bellProps: NotificationBellProps = {
    notifications,
    onMarkAllRead: handleMarkAllRead,
    onAccept:      handleAccept,
    onReject:      handleReject,
    isProcessing,
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

        {/* ── Desktop nav ── */}
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
                  {subLinks && (
                    <span className="text-[10px] ml-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      ▼
                    </span>
                  )}
                </Link>

                {subLinks && (
                  <div className="absolute top-full left-0 mt-0 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                    {subLinks.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`block px-4 py-3 text-sm font-bold transition hover:bg-slate-800 ${
                          sub.href === "/team"
                            ? "text-blue-400 border-t border-slate-800 mt-1"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}

          {user ? (
            <li className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-800">
              {/* Desktop bell — its own component instance, its own ref */}
              <NotificationBell {...bellProps} />
              
              {/* ✅ 修改：將原本的 "ME" 替換為個人圓形頭像 (DP) */}
              <Link
                href="/profile"
                className={cn(
                  "relative flex size-8 shrink-0 overflow-hidden rounded-full border-2 transition-all duration-200",
                  pathname === "/profile" ? "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "border-slate-700 hover:border-slate-400"
                )}
                aria-label="前往個人檔案"
              >
                {avatarUrl ? (
                  <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-800">
                    <User className="size-4 text-slate-400" />
                  </div>
                )}
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="登出"
              >
                <LogOut className="size-4" />
              </button>
            </li>
          ) : (
            <li>
              <Link
                href="/auth"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                登入
              </Link>
            </li>
          )}
        </ul>

        {/* ── Mobile right cluster ── */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile bell — separate component instance, separate ref */}
          {user && <NotificationBell {...bellProps} />}
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile menu ── */}
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
                      isActive
                        ? "bg-blue-600/15 text-blue-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    )}
                    onClick={() => !subLinks && setMobileOpen(false)}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>

                  {subLinks && (
                    <div className="pl-10 pr-3 pb-2 space-y-1 border-l-2 border-slate-800 ml-5">
                      {subLinks.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={`block py-2.5 text-sm font-medium transition-colors ${
                            sub.href === "/team"
                              ? "text-blue-400"
                              : "text-zinc-500 hover:text-white"
                          }`}
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

            {/* No /friends link here — friend management is accessed via:
                  1. Bell dropdown → "管理所有好友請求 →" → /profile?tab=friends
                  2. Directly visiting /profile
                Both desktop and mobile behave identically. */}
            {user ? (
              <>
                <li>
                  {/* ✅ 修改：Mobile 版本將頭像與名稱放在選單內 */}
                  <Link
                    href="/profile"
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors",
                      pathname === "/profile"
                        ? "text-blue-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {avatarUrl ? (
                      <div className="size-6 rounded-full bg-cover bg-center border border-slate-600" style={{ backgroundImage: `url(${avatarUrl})` }} />
                    ) : (
                      <div className="size-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                        <User className="size-3 text-slate-400" />
                      </div>
                    )}
                    個人檔案 / 管理
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <LogOut className="size-4" /> 登出
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth"
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
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
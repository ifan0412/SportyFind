"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Menu, Users, GraduationCap, Zap, X, LogOut, Shield, Activity, Bell, User, MessageSquare, Trophy, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

const navLinks = [
  { href: "/network", label: "Players", icon: Users },
  { href: "/coaches", label: "Coaches", icon: GraduationCap },
  { href: "/team",    label: "Teams",   icon: Shield },
  { href: "/events",  label: "Events",  icon: Trophy },
  { href: "/physio",  label: "Physio",  icon: Activity },
];

export interface Notification {
  id: string;
  // ✅ Added coach_enquiry and coach_review to the type union
  type: "friend_request" | "friend_accepted" | "team_join_request" | "team_request_accepted" | "team_request_rejected" | "event_registration" | "event_kicked" | "coach_enquiry" | "coach_review";
  is_read: boolean;
  created_at: string;
  friendship_id: string | null;
  team_id: string | null;
  event_id: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface NotificationBellProps {
  notifications: Notification[];
  onMarkAllRead: () => Promise<void>;
  onAccept: (notif: Notification) => Promise<void>;
  onReject: (notif: Notification) => Promise<void>;
  onDismiss: (e: React.MouseEvent, notifId: string) => Promise<void>;
  isProcessing: (id: string) => boolean;
  router: any;
}

function NotificationBell({
  notifications,
  onMarkAllRead,
  onAccept,
  onReject,
  onDismiss,
  isProcessing,
  router,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotifClick = (notif: Notification) => {
    setOpen(false);

    // ✅ Added coach_enquiry and coach_review navigation
    if (notif.type === "coach_enquiry") {
      router.push("/profile?tab=coach&subtab=inbox");
      return;
    }
    if (notif.type === "coach_review") {
      router.push("/profile?tab=coach&subtab=services");
      return;
    }
    if (notif.type === "team_join_request" && notif.team_id) {
      router.push(`/team/${notif.team_id}/admin`);
    } else if ((notif.type === "team_request_accepted" || notif.type === "team_request_rejected") && notif.team_id) {
      router.push(`/team/${notif.team_id}`);
    } else if (notif.type === "event_registration" && notif.event_id) {
      router.push(`/events/${notif.event_id}`);
    } else if (notif.type === "event_kicked" && notif.event_id) {
      router.push(`/events/${notif.event_id}`);
    } else {
      router.push("/profile?tab=friends");
    }
  };

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
    if (willOpen && unreadCount > 0) await onMarkAllRead();
  };

  return (
    <div className="relative" ref={ref}>
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

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-black text-white">通知</span>
            <span className="text-xs text-zinc-500">{notifications.length} 則</span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-sm font-bold">暫無通知</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`relative p-4 transition-colors cursor-pointer hover:bg-slate-800/50 ${!notif.is_read ? "bg-blue-500/5" : ""}`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(e, notif.id); }}
                    className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-white hover:bg-slate-700 rounded-full transition-colors z-10"
                    title="移除通知"
                  >
                    <X className="size-3" />
                  </button>

                  <div className="flex items-center gap-3 mb-3 pr-4">
                    <div
                      className="w-9 h-9 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{
                        backgroundImage: notif.sender?.avatar_url ? `url(${notif.sender.avatar_url})` : "none",
                        backgroundSize: "cover",
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
                          <><span className="text-white">{notif.sender?.full_name ?? "某人"}</span> 想與你成為好友</>
                        )}
                        {notif.type === "friend_accepted" && (
                          <><span className="text-white">{notif.sender?.full_name ?? "某人"}</span> 接受了你的好友請求 🎉</>
                        )}
                        {notif.type === "team_join_request" && (
                          <><span className="text-white">{notif.sender?.full_name ?? "某人"}</span> 申請加入您的球隊</>
                        )}
                        {notif.type === "team_request_accepted" && (
                          <><span className="text-white">系統通知</span>：您的加入申請已被接受 🎉</>
                        )}
                        {notif.type === "team_request_rejected" && (
                          <><span className="text-white">系統通知</span>：您的加入申請已被拒絕</>
                        )}
                        {notif.type === "event_registration" && (
                          <><span className="text-white">{notif.sender?.full_name ?? "某人"}</span> 報名了您主辦的活動</>
                        )}
                        {notif.type === "event_kicked" && (
                          <><span className="text-white">系統通知</span>：您已被主辦方移除出某活動的參賽名單</>
                        )}
                        {/* ✅ NEW: coach enquiry notification text */}
                        {notif.type === "coach_enquiry" && (
                          <><span className="text-white">{notif.sender?.full_name ?? "某學員"}</span> 向您發送了一份課程諮詢單 📬</>
                        )}
                        {/* ✅ NEW: coach review notification text */}
                        {notif.type === "coach_review" && (
                          <><span className="text-white">{notif.sender?.full_name ?? "某學員"}</span> 為您的課程留下了一則評價 ⭐</>
                        )}
                      </p>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(notif.created_at).toLocaleString("zh-HK", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {!notif.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>

                  {notif.type === "friend_request" && notif.friendship_id && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onAccept(notif); }}
                        disabled={isProcessing(notif.id)}
                        className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black transition z-10 relative"
                      >
                        {isProcessing(notif.id) ? "處理中..." : "✓ 接受"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onReject(notif); }}
                        disabled={isProcessing(notif.id)}
                        className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-red-400 text-xs font-black transition z-10 relative"
                      >
                        {isProcessing(notif.id) ? "處理中..." : "✕ 拒絕"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser]             = useState<SupabaseAuthUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const processingIds = useRef<Set<string>>(new Set());
  const [processingSet, setProcessingSet] = useState<Set<string>>(new Set());

  const isProcessing    = (id: string) => processingSet.has(id);
  const startProcessing = (id: string) => { processingIds.current.add(id); setProcessingSet(new Set(processingIds.current)); };
  const stopProcessing  = (id: string) => { processingIds.current.delete(id); setProcessingSet(new Set(processingIds.current)); };

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileOpen]);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ), []);

  const fetchNotifications = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("notifications")
      .select(
        `id, type, is_read, created_at, friendship_id, team_id, event_id,
         sender:sender_id (id, full_name, avatar_url)`
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
  
    if (data) setNotifications(data as unknown as Notification[]);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      if (data.user) await fetchNotifications(data.user.id);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" && session?.user) await fetchNotifications(session.user.id);
      if (event === "SIGNED_OUT") { setNotifications([]); }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [supabase, router, fetchNotifications]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const subscribe = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || !isMounted) return; 
      const uid = currentUser.id;

      channel = supabase
        .channel(`navbar-notif-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          async (payload) => {
            const { data: newNotif } = await supabase
              .from("notifications")
              .select(`id, type, is_read, created_at, friendship_id, team_id, event_id, sender:sender_id (id, full_name, avatar_url)`)
              .eq("id", payload.new.id)
              .single();

            if (newNotif && isMounted) {
              setNotifications((prev) => {
                if (prev.some((n) => n.id === newNotif.id)) return prev;
                return [newNotif as unknown as Notification, ...prev];
              });
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        )
        .subscribe();
    };

    subscribe();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  }, [supabase, user?.id]);

  const handleAccept = useCallback(async (notif: Notification) => {
    if (!notif.friendship_id || !user?.id || isProcessing(notif.id)) return;
    startProcessing(notif.id);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", notif.friendship_id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      window.dispatchEvent(new CustomEvent("sync-friendship"));
    } catch (err) {
      console.error("handleAccept:", err);
    } finally {
      stopProcessing(notif.id);
    }
  }, [supabase, user?.id, processingSet]);

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
  }, [supabase, processingSet]);

  const handleDismiss = useCallback(async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    await supabase.from("notifications").delete().eq("id", notifId);
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setNotifications([]);
    router.push("/"); router.refresh();
  };

  const bellProps: NotificationBellProps = {
    notifications,
    onMarkAllRead: handleMarkAllRead,
    onAccept:      handleAccept,
    onReject:      handleReject,
    onDismiss:     handleDismiss,
    isProcessing,
    router,
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md shadow-sm">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">

        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80" onClick={() => setMobileOpen(false)}>
          <Image
            src="/icon-512.png"
            alt="SportyFind Logo"
            width={32}
            height={32}
            className="size-8 rounded-md object-contain"
            priority
          />
          <span className="text-sm font-black tracking-tight text-white sm:text-base">
            SPORTY<span className="text-blue-400">FIND</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-4 text-sm font-medium transition-colors",
                    isActive ? "text-blue-400" : "text-slate-400 hover:text-white",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}

          {user ? (
            <li className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-800">
              <NotificationBell {...bellProps} /> 
              <Link 
                href="/inbox" 
                className="text-slate-400 hover:text-white transition-colors p-2 rounded-md hover:bg-slate-800 flex items-center justify-center" 
                title="收件匣"
              >
                <MessageSquare className="w-5 h-5" />
              </Link>
              <Link 
                href="/events/my" 
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 bg-slate-900",
                  pathname === "/events/my" 
                    ? "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] text-amber-400" 
                    : "border-slate-700 text-slate-400 hover:border-slate-400 hover:text-white"
                )}
                title="我的賽事中心"
              >
                <Calendar className="size-4" />
              </Link>
              <Link
                href="/profile"
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-200 bg-slate-900",
                  pathname === "/profile" 
                    ? "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400" 
                    : "border-slate-700 text-slate-400 hover:border-slate-400 hover:text-white"
                )}
                title="個人檔案"
              >
                <User className="size-4" />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                title="登出"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </li>
          ) : (
            <li>
              <Link 
                href="/auth" 
                className="flex items-center justify-center gap-2 rounded-xl px-5 py-1 text-sm font-black bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-lg active:scale-95"
              >
                Login / Register
              </Link>
            </li>
          )}
        </ul>

        <div className="flex items-center gap-2 md:hidden">
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

      {mobileOpen && (
        <div className="absolute top-full left-0 w-full h-[calc(100vh-3.5rem)] bg-slate-950 md:hidden overflow-y-auto border-t border-slate-800 shadow-2xl">
          <ul className="mx-auto w-full max-w-6xl space-y-2 px-4 py-6 sm:px-6">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors",
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

            <div className="h-px bg-slate-800 my-4" />

            {user ? (
              <>
                <li>
                  <Link
                    href="/events/my"
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors",
                      pathname === "/events/my" ? "text-amber-400" : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Calendar className="size-4" /> 我的賽事 / 行程中心
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profile"
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors",
                      pathname === "/profile" ? "text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <User className="size-4" /> 個人檔案 / 管理
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
                  className="flex items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-lg active:scale-95" 
                  onClick={() => setMobileOpen(false)}
                >
                  Login / Register
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
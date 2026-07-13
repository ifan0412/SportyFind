"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  LogOut,
  Bell,
  MessageSquare,
  Calendar,
  X,
  Settings2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSiteAdmin } from "@/lib/admin";
import { navLinks } from "@/lib/nav-links";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeSupabaseQuery } from "@/lib/supabase/safe-query";
import { useAuth } from "@/components/SupabaseProvider";
import { useProfileNav } from "@/lib/hooks/useProfileNav";
import { useScrollHideHeader } from "@/lib/use-scroll-hide-header";
import { ProfileNavMenu } from "@/components/NavbarProfileMenu";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { MobileSettingsSheet } from "@/components/mobile/MobileSettingsSheet";
import { getNotificationHref } from "@/components/notifications/notification-routing";
import { mapNotificationRow } from "@/lib/notifications/normalize";
import { LOGIN_DESKTOP_BUTTON_CLASS } from "@/lib/login-button-styles";
import type { Notification } from "@/components/notifications/notification-types";

interface NotificationBellProps {
  notifications: Notification[];
  onMarkAllRead: () => Promise<void>;
  onAccept: (notif: Notification) => Promise<void>;
  onReject: (notif: Notification) => Promise<void>;
  onDismiss: (e: React.MouseEvent, notifId: string) => Promise<void>;
  isProcessing: (id: string) => boolean;
  onNotifNavigate: (notif: Notification) => void;
}

function NotificationBellDesktop({
  notifications,
  onMarkAllRead,
  onAccept,
  onReject,
  onDismiss,
  isProcessing,
  onNotifNavigate,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
          <NotificationPanel
            notifications={notifications}
            onNotifClick={(notif) => {
              setOpen(false);
              onNotifNavigate(notif);
            }}
            onAccept={onAccept}
            onReject={onReject}
            onDismiss={onDismiss}
            isProcessing={isProcessing}
            className="max-h-96"
          />
        </div>
      )}
    </div>
  );
}

function MobileNotificationSheet({
  open,
  onClose,
  notifications,
  onMarkAllRead,
  onAccept,
  onReject,
  onDismiss,
  isProcessing,
  onNotifNavigate,
}: NotificationBellProps & { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      onMarkAllRead().catch(() => {});
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, onMarkAllRead]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] md:hidden flex flex-col bg-slate-950 overflow-hidden">
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <h1 className="text-sm font-black text-white">通知</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉通知"
          className="flex items-center justify-center w-9 h-9 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <NotificationPanel
          notifications={notifications}
          onNotifClick={(notif) => {
            onClose();
            onNotifNavigate(notif);
          }}
          onAccept={onAccept}
          onReject={onReject}
          onDismiss={onDismiss}
          isProcessing={isProcessing}
          className="h-full touch-pan-y"
        />
      </div>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const mobileHeaderRef = useRef<HTMLElement>(null);

  const [isClient, setIsClient] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const profileNav = useProfileNav(user?.id);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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

  useScrollHideHeader(mobileHeaderRef);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setMobileNotifOpen(false);
    setMobileSettingsOpen(false);
  }, [pathname]);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const fetchNotifications = useCallback(
    async (uid: string) => {
      const { data } = await safeSupabaseQuery(
        supabase
          .from("notifications")
          .select(
            `id, type, is_read, created_at, push_eligible, friendship_id, team_id, event_id,
         sender:sender_id (id, full_name, avatar_url)`
          )
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
      );

      if (data) {
        setNotifications(
          (data as unknown[])
            .map((row) => mapNotificationRow(row))
            .filter((row): row is Notification => row !== null)
        );
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await fetchNotifications(user.id);
      } catch (err) {
        if (!cancelled) console.error("Navbar init:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;

    const uid = user.id;
    const channel = supabase
      .channel(`navbar-notif-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        async (payload) => {
          try {
            const row = payload.new as Record<string, unknown>;
            const { data: newNotif } = await supabase
              .from("notifications")
              .select(
                `id, type, is_read, created_at, push_eligible, friendship_id, team_id, event_id, sender:sender_id (id, full_name, avatar_url)`
              )
              .eq("id", row.id)
              .single();

            const mapped = mapNotificationRow(newNotif ?? row);
            if (mapped) {
              setNotifications((prev) => {
                if (prev.some((n) => n.id === mapped.id)) return prev;
                return [mapped, ...prev];
              });
            }
          } catch {
            const mapped = mapNotificationRow(payload.new);
            if (mapped) {
              setNotifications((prev) => {
                if (prev.some((n) => n.id === mapped.id)) return prev;
                return [mapped, ...prev];
              });
            }
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          const updated = payload.new as { id: string; is_read?: boolean };
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updated.id ? { ...n, is_read: updated.is_read ?? n.is_read } : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const refetch = () => {
      void fetchNotifications(user.id);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refetch);
    window.addEventListener("chat-message-sync", refetch);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refetch);
      window.removeEventListener("chat-message-sync", refetch);
    };
  }, [user?.id, fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [supabase, user?.id]);

  const handleAccept = useCallback(
    async (notif: Notification) => {
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
    },
    [supabase, user?.id, processingSet]
  );

  const handleReject = useCallback(
    async (notif: Notification) => {
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
    },
    [supabase, processingSet]
  );

  const handleDismiss = useCallback(
    async (e: React.MouseEvent, notifId: string) => {
      e.stopPropagation();
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      await supabase.from("notifications").delete().eq("id", notifId);
    },
    [supabase]
  );

  const handleNotifNavigate = useCallback(
    (notif: Notification) => {
      router.push(getNotificationHref(notif));
    },
    [router]
  );

  const handleLogout = async () => {
    setNotifications([]);
    await signOut();
  };

  const bellProps: NotificationBellProps = {
    notifications,
    onMarkAllRead: handleMarkAllRead,
    onAccept: handleAccept,
    onReject: handleReject,
    onDismiss: handleDismiss,
    isProcessing,
    onNotifNavigate: handleNotifNavigate,
  };

  const showAdmin = isClient && isSiteAdmin(user?.email);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const showMobileSettings = Boolean(isClient && user);

  return (
    <>
      {/* Mobile header */}
      <header
        ref={mobileHeaderRef}
        data-mobile-header
        data-revealing="false"
        className={cn(
          "md:hidden fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-sm",
          "will-change-transform data-[revealing=true]:transition-transform data-[revealing=true]:duration-200",
          "data-[revealing=true]:ease-[cubic-bezier(0.32,0.72,0,1)]"
        )}
      >
        <nav className="relative grid h-14 w-full grid-cols-[2.25rem_1fr_auto] items-center gap-2 px-4">
          <div className="flex justify-start">
            {showMobileSettings ? (
              <button
                type="button"
                onClick={() => {
                  setMobileSettingsOpen((open) => !open);
                  setMobileNotifOpen(false);
                }}
                aria-label="設定"
                aria-expanded={mobileSettingsOpen}
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-md transition-colors",
                  mobileSettingsOpen
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Settings className="size-5" />
              </button>
            ) : (
              <span className="w-9" aria-hidden />
            )}
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 transition-opacity hover:opacity-80 min-w-0"
          >
            <Image
              src="/icon-512.png"
              alt="SportyFind Logo"
              width={32}
              height={32}
              className="size-8 rounded-md object-contain shrink-0"
              priority
            />
            <span className="text-sm font-black tracking-tight text-white truncate">
              SPORTY<span className="text-blue-400">FIND</span>
            </span>
          </Link>

          <div className="flex justify-end min-w-[2.25rem]">
            {isClient && user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileNotifOpen((open) => !open);
                  setMobileSettingsOpen(false);
                }}
                aria-label="通知"
                aria-expanded={mobileNotifOpen}
                className={cn(
                  "relative flex items-center justify-center w-9 h-9 rounded-md transition-colors",
                  mobileNotifOpen
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 shadow-lg">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            ) : (
              <span className="w-9" aria-hidden />
            )}
          </div>
        </nav>
      </header>
      <div className="h-14 shrink-0 md:hidden" aria-hidden />

      {/* Desktop header */}
      <header className="hidden md:block sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md shadow-sm">
        <nav className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
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

            {showAdmin && (
              <Link
                href="/admin/analytics"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition",
                  pathname.startsWith("/admin")
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-slate-700 bg-slate-900 text-zinc-400 hover:border-red-500/40 hover:text-red-400"
                )}
                title="網站管理員 CMS"
              >
                <Settings2 className="size-3" />
                Admin
              </Link>
            )}
          </div>

          <ul className="flex flex-nowrap items-center gap-0.5 min-w-0">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const hrefPath = href.split("?")[0];
              const isActive = pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
              return (
                <li key={href} className="shrink-0">
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors lg:px-3 lg:text-sm",
                      isActive ? "text-blue-400" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}

            {user ? (
              <li className="flex shrink-0 items-center gap-2 ml-2 pl-3 border-l border-slate-800 lg:gap-3 lg:ml-3 lg:pl-4">
                <NotificationBellDesktop {...bellProps} />
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
                      ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400"
                      : "border-slate-700 text-slate-400 hover:border-slate-400 hover:text-white"
                  )}
                  title="我的賽事/活動"
                >
                  <Calendar className="size-4" />
                </Link>
                <ProfileNavMenu pathname={pathname} profileNav={profileNav} variant="desktop" />
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
                <Link href="/auth" className={LOGIN_DESKTOP_BUTTON_CLASS}>
                  登入 / 註冊
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </header>

      <MobileNotificationSheet
        open={mobileNotifOpen}
        onClose={() => setMobileNotifOpen(false)}
        {...bellProps}
      />

      {user ? (
        <MobileSettingsSheet
          open={mobileSettingsOpen}
          onClose={() => setMobileSettingsOpen(false)}
          user={user}
        />
      ) : null}
    </>
  );
}

// Re-export for any legacy imports
export type { Notification } from "@/components/notifications/notification-types";

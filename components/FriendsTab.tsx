"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Users, Clock, Send, UserX, Check, X } from "lucide-react";

// ── Supabase response shapes ───────────────────────────────────────────────
interface ProfileJoin {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
}

interface FriendshipRow {
  id: string;
  created_at: string;
  sender: ProfileJoin;
  receiver: ProfileJoin;
}

interface PendingRow {
  id: string;
  created_at: string;
  sender: ProfileJoin;
}

interface SentRow {
  id: string;
  created_at: string;
  receiver: ProfileJoin;
}

// ── UI types ───────────────────────────────────────────────────────────────
interface FriendProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
}

interface Friendship {
  id: string;
  created_at: string;
  friend: FriendProfile;
}

interface PendingRequest {
  id: string;
  created_at: string;
  sender: FriendProfile;
}

interface SentRequest {
  id: string;
  created_at: string;
  receiver: FriendProfile;
}

type SubTab = "friends" | "pending" | "sent";

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ profile }: { profile: FriendProfile }) {
  return (
    <div
      className="w-12 h-12 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage:    profile.avatar_url ? `url(${profile.avatar_url})` : "none",
        backgroundSize:     "cover",
        backgroundPosition: "center",
      }}
    >
      {!profile.avatar_url && (
        <span className="text-sm font-black text-zinc-500">
          {profile.full_name?.[0] ?? "?"}
        </span>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({
  icon, title, desc, action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl py-16 text-center px-4">
      <div className="flex justify-center mb-4">{icon}</div>
      <p className="text-white font-black text-sm mb-1">{title}</p>
      <p className="text-zinc-500 text-xs mb-4">{desc}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ── FriendsTab ─────────────────────────────────────────────────────────────
interface FriendsTabProps {
  currentUserId: string;
}

export function FriendsTab({ currentUserId }: FriendsTabProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [activeSubTab, setActiveSubTab] = useState<SubTab>("friends");
  const [isLoading, setIsLoading]       = useState(true);

  const [friends,         setFriends]         = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests]  = useState<PendingRequest[]>([]);
  const [sentRequests,    setSentRequests]     = useState<SentRequest[]>([]);

  // ── Double-click protection ──────────────────────────────────────────────
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const isProcessing    = (id: string) => processingIds.has(id);
  const startProcessing = (id: string) =>
    setProcessingIds((prev) => new Set(prev).add(id));
  const stopProcessing  = (id: string) =>
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  // ── Fetch all three lists ────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);

    const [friendsRes, pendingRes, sentRes] = await Promise.all([
      supabase
        .from("friendships")
        .select(`
          id, created_at,
          sender:sender_id     (id, full_name, avatar_url, headline, location),
          receiver:receiver_id (id, full_name, avatar_url, headline, location)
        `)
        .eq("status", "accepted")
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`),

      supabase
        .from("friendships")
        .select(`
          id, created_at,
          sender:sender_id (id, full_name, avatar_url, headline, location)
        `)
        .eq("status", "pending")
        .eq("receiver_id", currentUserId),

      supabase
        .from("friendships")
        .select(`
          id, created_at,
          receiver:receiver_id (id, full_name, avatar_url, headline, location)
        `)
        .eq("status", "pending")
        .eq("sender_id", currentUserId),
    ]);

    // ── Type-safe mapping — bypassing Supabase array inference ──
    if (friendsRes.data) {
      setFriends(
        (friendsRes.data as unknown as FriendshipRow[]).map((f) => ({
          id:         f.id,
          created_at: f.created_at,
          friend:     f.sender?.id === currentUserId ? f.receiver : f.sender,
        }))
      );
    }

    if (pendingRes.data) {
      setPendingRequests(
        (pendingRes.data as unknown as PendingRow[]).map((f) => ({
          id:         f.id,
          created_at: f.created_at,
          sender:     f.sender,
        }))
      );
    }

    if (sentRes.data) {
      setSentRequests(
        (sentRes.data as unknown as SentRow[]).map((f) => ({
          id:         f.id,
          created_at: f.created_at,
          receiver:   f.receiver,
        }))
      );
    }

    setIsLoading(false);
  }, [supabase, currentUserId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("friends-tab-realtime")
      .on("postgres_changes", { event:  "INSERT", schema: "public", table:  "friendships" }, () => fetchAll())
      .on("postgres_changes", { event:  "UPDATE", schema: "public", table:  "friendships" }, () => fetchAll())
      .on("postgres_changes", { event:  "DELETE", schema: "public", table:  "friendships" }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchAll]);

  // ── Accept ───────────────────────────────────────────────────────────────
  const handleAccept = async (req: PendingRequest) => {
    if (isProcessing(req.id)) return;
    if (!req.sender?.id) return;

    startProcessing(req.id);
    try {
      // ✅ 只需要更新 friendship 狀態
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", req.id);
        
      if (error) throw error;

      // 更新本地 UI：從「待處理」移到「好友列表」
      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
      setFriends((prev) => [
        ...prev,
        { id: req.id, created_at: new Date().toISOString(), friend: req.sender },
      ]);
    } catch (err) {
      console.error("handleAccept:", err);
    } finally {
      stopProcessing(req.id);
    }
  };

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleReject = async (req: PendingRequest) => {
    if (isProcessing(req.id)) return;
    startProcessing(req.id);
    try {
      const [updateF, deleteN] = await Promise.all([
        supabase.from("friendships").update({ status: "rejected" }).eq("id", req.id),
        supabase.from("notifications").delete().eq("friendship_id", req.id).eq("type", "friend_request"),
      ]);
      if (updateF.error) throw updateF.error;
      if (deleteN.error) throw deleteN.error;

      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
      window.dispatchEvent(new CustomEvent("sync-friendship"));
    } catch (err) {
      console.error("handleReject:", err);
    } finally {
      stopProcessing(req.id);
    }
  };

  // ── Cancel sent request ──────────────────────────────────────────────────
  const handleCancel = async (req: SentRequest) => {
    if (isProcessing(req.id)) return;
    startProcessing(req.id);
    try {
      const { error } = await supabase.from("friendships").delete().eq("id", req.id);
      if (error) throw error;
      setSentRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      console.error("handleCancel:", err);
    } finally {
      stopProcessing(req.id);
    }
  };

  // ── Unfriend ─────────────────────────────────────────────────────────────
  const handleUnfriend = async (friendship: Friendship) => {
    // ✅ 加入確認對話框
    const isConfirmed = window.confirm(`確定要與 ${friendship.friend.full_name || "這位運動員"} 解除好友關係嗎？`);
    if (!isConfirmed) return; // 如果使用者點擊「取消」，則中斷執行

    if (isProcessing(friendship.id)) return;
    startProcessing(friendship.id);
    try {
      const { error } = await supabase.from("friendships").delete().eq("id", friendship.id);
      if (error) throw error;
      setFriends((prev) => prev.filter((f) => f.id !== friendship.id));
    } catch (err) {
      console.error("handleUnfriend:", err);
    } finally {
      stopProcessing(friendship.id);
    }
  };

  // ── Sub-tab config ───────────────────────────────────────────────────────
  const subTabs: { key: SubTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "friends", label: "好友列表",   icon: <Users className="size-4" />, count: friends.length },
    { key: "pending", label: "待接受請求", icon: <Clock className="size-4" />, count: pendingRequests.length },
    { key: "sent",    label: "已發送請求", icon: <Send  className="size-4" />, count: sentRequests.length },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Sub-tabs */}
      <div className="flex gap-2 bg-slate-900/60 border border-slate-800 p-1.5 rounded-2xl">
        {subTabs.map(({ key, label, icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveSubTab(key)}
            className={[
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs md:text-sm font-black transition-all",
              activeSubTab === key
                ? "bg-blue-600 text-white shadow-lg"
                : "text-zinc-400 hover:text-white hover:bg-slate-800"
            ].join(" ")}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && (
              <span className={[
                "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                activeSubTab === key ? "bg-white/20" : "bg-slate-700 text-zinc-300"
              ].join(" ")}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center text-zinc-500 text-sm">載入中...</div>
      ) : (
        <>
          {/* ── Friends list ── */}
          {activeSubTab === "friends" && (
            <div className="space-y-3">
              {friends.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-8 text-zinc-600" />}
                  title="還沒有好友"
                  desc="前往人脈網路認識新朋友吧！"
                  action={{ href: "/network", label: "探索人脈網路 →" }}
                />
              ) : (
                friends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition"
                  >
                    <Avatar profile={f.friend} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">
                        {f.friend.full_name ?? "運動員"}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {f.friend.headline ?? f.friend.location ?? ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/p/${f.friend.id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-blue-600 text-zinc-300 hover:text-white text-xs font-black transition"
                      >
                        查看檔案
                      </Link>
                      <button
                        onClick={() => handleUnfriend(f)}
                        disabled={isProcessing(f.id)}
                        title="解除好友"
                        className="p-1.5 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition"
                      >
                        <UserX className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Pending requests ── */}
          {activeSubTab === "pending" && (
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <EmptyState
                  icon={<Clock className="size-8 text-zinc-600" />}
                  title="沒有待接受的好友請求"
                  desc="當有人向你發送好友請求時，會顯示在這裡。"
                />
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition"
                  >
                    <Avatar profile={req.sender} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">
                        {req.sender.full_name ?? "運動員"}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {req.sender.headline ?? req.sender.location ?? ""}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString("zh-HK", {
                          month: "short", day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(req)}
                        disabled={isProcessing(req.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black transition"
                      >
                        <Check className="size-3" /> 接受
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        disabled={isProcessing(req.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-red-400 text-xs font-black transition"
                      >
                        <X className="size-3" /> 拒絕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Sent requests ── */}
          {activeSubTab === "sent" && (
            <div className="space-y-3">
              {sentRequests.length === 0 ? (
                <EmptyState
                  icon={<Send className="size-8 text-zinc-600" />}
                  title="沒有已發送的好友請求"
                  desc="前往人脈網路向其他運動員發送好友請求。"
                  action={{ href: "/network", label: "探索人脈網路 →" }}
                />
              ) : (
                sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition"
                  >
                    <Avatar profile={req.receiver} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">
                        {req.receiver.full_name ?? "運動員"}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {req.receiver.headline ?? req.receiver.location ?? ""}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        已發送於{" "}
                        {new Date(req.created_at).toLocaleDateString("zh-HK", {
                          month: "short", day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/p/${req.receiver.id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-black transition"
                      >
                        查看檔案
                      </Link>
                      <button
                        onClick={() => handleCancel(req)}
                        disabled={isProcessing(req.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-red-400 text-xs font-black transition"
                      >
                        <X className="size-3" /> 取消請求
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
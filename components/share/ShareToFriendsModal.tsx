"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchAcceptedFriends, type FriendProfile } from "@/lib/friends-list";
import { buildShareMessage, type SharePayload } from "@/lib/share-payload";
import { useAuth } from "@/components/SupabaseProvider";

interface ShareToFriendsModalProps {
  open: boolean;
  onClose: () => void;
  payload: SharePayload;
}

export function ShareToFriendsModal({ open, onClose, payload }: ShareToFriendsModalProps) {
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    setSelected(new Set());
    setQuery("");
    void fetchAcceptedFriends(supabase, user.id)
      .then(setFriends)
      .finally(() => setLoading(false));
  }, [open, supabase, user]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const filtered = friends.filter((f) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      f.full_name?.toLowerCase().includes(q) ||
      f.handle?.toLowerCase().includes(q)
    );
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!user || selected.size === 0 || sending) return;
    setSending(true);
    try {
      const content = buildShareMessage(payload);
      const inserts = Array.from(selected).map((receiver_id) => ({
        sender_id: user.id,
        receiver_id,
        content,
      }));
      const { error } = await supabase.from("messages").insert(inserts);
      if (error) throw error;
      toast.success(`已分享給 ${selected.size} 位好友`);
      window.dispatchEvent(new CustomEvent("chat-message-sync"));
      onClose();
    } catch {
      toast.error("分享失敗，請稍後再試");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="關閉"
        className="absolute inset-0 bg-slate-950/80"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <h2 className="text-sm font-black text-white">分享給 SportyFind 好友</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-800 shrink-0">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋好友…"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="py-12 flex justify-center text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-xs text-zinc-500 font-bold">
              {friends.length === 0 ? "你尚未有已接受的好友" : "找不到符合的好友"}
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((friend) => {
                const checked = selected.has(friend.id);
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      onClick={() => toggle(friend.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left ${
                        checked
                          ? "bg-blue-600/15 border border-blue-500/30"
                          : "hover:bg-slate-800 border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={checked}
                        className="rounded border-slate-600"
                      />
                      <div
                        className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center border border-slate-700 shrink-0"
                        style={
                          friend.avatar_url
                            ? { backgroundImage: `url(${friend.avatar_url})` }
                            : undefined
                        }
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {friend.full_name || "未命名"}
                        </p>
                        {friend.handle ? (
                          <p className="text-[11px] text-zinc-500 truncate">@{friend.handle}</p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-800 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
          <button
            type="button"
            disabled={selected.size === 0 || sending}
            onClick={handleSend}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-zinc-600 text-white text-sm font-black transition"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                傳送中…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                傳送 ({selected.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

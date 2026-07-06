"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Send, Loader2, AlertCircle, RefreshCw, Check, X } from "lucide-react";
import {
  CHAT_BUBBLE_ME,
  CHAT_BUBBLE_ROW_ME,
  CHAT_BUBBLE_ROW_THEM,
  CHAT_BUBBLE_THEM,
} from "@/components/chat/styles";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  isSending?: boolean;
  isError?: boolean;
}

interface ChatBoxProps {
  currentUserId: string;
  targetUserId: string;
  targetAvatarUrl?: string;
  targetName?: string;
  friendshipStatus?: string; // "accepted" | "pending" | "rejected" | "none"
  isSender?: boolean;
}

const PAGE_SIZE = 50;

export function ChatBox({
  currentUserId,
  targetUserId,
  targetAvatarUrl,
  targetName,
  friendshipStatus: initialStatus = "none",
  isSender: initialIsSender = false,
}: ChatBoxProps) {
  // ── Stable supabase client (never recreated on re-render) ──
  const supabase = useRef(createSupabaseBrowserClient()).current;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSendingLocked, setIsSendingLocked] = useState(false);

  // ── Anti-Spam State Machine ──
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(initialStatus);
  const [isSenderState, setIsSenderState] = useState<boolean>(initialIsSender);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesLengthRef = useRef(0);

  const scrollToBottom = useCallback((delay = 50) => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, delay);
  }, []);

  // ── 0. Fetch authoritative friendship status ──
  useEffect(() => {
    const fetchFriendship = async () => {
      const { data: friendRow } = await supabase
        .from("friendships")
        .select("id, status, sender_id")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),` +
          `and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`
        )
        .maybeSingle();

      if (friendRow) {
        setFriendshipId(friendRow.id);
        setStatus(friendRow.status);
        setIsSenderState(friendRow.sender_id === currentUserId);
      } else {
        setFriendshipId(null);
        setStatus("none");
        setIsSenderState(true);
      }
    };

    if (currentUserId && targetUserId) {
      fetchFriendship();
    }
  }, [currentUserId, targetUserId, supabase]);

  // ── 1. Mark incoming messages as read ──
  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) return;
      await supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", messageIds)
        .eq("receiver_id", currentUserId);
    },
    [currentUserId, supabase]
  );

  // ── 2. Load paginated messages ──
  const loadMessages = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const offset = isInitial ? 0 : messagesLengthRef.current;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),` +
          `and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("[ChatBox] loadMessages error:", error.message);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (data) {
        if (data.length < PAGE_SIZE) setHasMore(false);

        const chronological = [...data].reverse();

        setMessages((prev) => {
          const combined = isInitial
            ? chronological
            : [...chronological, ...prev];
          const unique = Array.from(
            new Map(combined.map((item) => [item.id, item])).values()
          );
          messagesLengthRef.current = unique.length;
          return unique;
        });

        const unread = data
          .filter((m) => m.receiver_id === currentUserId && !m.is_read)
          .map((m) => m.id);
        markAsRead(unread);

        if (isInitial) scrollToBottom(100);
      }

      setIsLoading(false);
      setIsLoadingMore(false);
    },
    [currentUserId, targetUserId, supabase, markAsRead, scrollToBottom]
  );

  // ── 3. Reset and load on target change ──
  useEffect(() => {
    setMessages([]);
    setHasMore(true);
    setIsLoading(true);
    messagesLengthRef.current = 0;
    loadMessages(true);
  }, [targetUserId, loadMessages]);

  // ── 4. Infinite scroll ──
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (e.currentTarget.scrollTop === 0 && hasMore && !isLoadingMore) {
        const oldScrollHeight = e.currentTarget.scrollHeight;
        loadMessages(false).then(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop =
              scrollRef.current.scrollHeight - oldScrollHeight;
          }
        });
      }
    },
    [hasMore, isLoadingMore, loadMessages]
  );

  // ── 5. Realtime subscription ──
  useEffect(() => {
    const channelName = `chat-${[currentUserId, targetUserId].sort().join("-")}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          const isRelevant =
            (newMsg.sender_id === currentUserId &&
              newMsg.receiver_id === targetUserId) ||
            (newMsg.sender_id === targetUserId &&
              newMsg.receiver_id === currentUserId);

          if (!isRelevant) return;

          setMessages((prev) => {
            const hasTempMatch = prev.some(
              (m) =>
                m.isSending &&
                m.sender_id === newMsg.sender_id &&
                m.content === newMsg.content
            );
            if (hasTempMatch) {
              return prev.map((m) =>
                m.isSending &&
                m.sender_id === newMsg.sender_id &&
                m.content === newMsg.content
                  ? newMsg
                  : m
              );
            }
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.receiver_id === currentUserId) {
            markAsRead([newMsg.id]);
          }

          scrollToBottom(50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, targetUserId, supabase, markAsRead, scrollToBottom]);

  // ── Manual Accept/Reject handlers for Receiver ──
  const handleManualAccept = async () => {
    if (!friendshipId) return;
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    setStatus("accepted");
  };

  const handleManualReject = async () => {
    if (!friendshipId) return;
    await supabase.from("friendships").update({ status: "rejected" }).eq("id", friendshipId);
    setStatus("rejected");
  };

  // ── 6. Optimistic send with Anti-Spam state rules ──
  const sendMessage = useCallback(
    async (msgText: string, retryTempId?: string) => {
      const tempId = retryTempId ?? `temp-${Date.now()}`;

      // A. Handle First Message Inquiry Creation
      if (status === "none") {
        const { data: newFriendRow, error: friendErr } = await supabase
          .from("friendships")
          .insert({
            sender_id: currentUserId,
            receiver_id: targetUserId,
            status: "pending",
          })
          .select("id")
          .single();

        if (friendErr && friendErr.code !== "23505") {
          console.error("[ChatBox] First inquiry error:", friendErr.message);
          return;
        }

        if (newFriendRow) setFriendshipId(newFriendRow.id);
        setStatus("pending");
        setIsSenderState(true);
      }

      // B. Handle Reply Auto-Accept (Receiver replying to pending request)
      if (status === "pending" && !isSenderState && friendshipId) {
        await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", friendshipId);

        setStatus("accepted");
      }

      // Optimistic UI Append
      if (!retryTempId) {
        const tempMsg: Message = {
          id: tempId,
          sender_id: currentUserId,
          receiver_id: targetUserId,
          content: msgText,
          created_at: new Date().toISOString(),
          is_read: false,
          isSending: true,
          isError: false,
        };
        setMessages((prev) => [...prev, tempMsg]);
        messagesLengthRef.current += 1;
        scrollToBottom(10);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === retryTempId ? { ...m, isSending: true, isError: false } : m
          )
        );
      }

      const { data: insertedMsg, error } = await supabase
        .from("messages")
        .insert({
          sender_id: currentUserId,
          receiver_id: targetUserId,
          content: msgText,
        })
        .select()
        .single();

      if (error || !insertedMsg) {
        console.error("[ChatBox] send error:", error?.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, isSending: false, isError: true } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? insertedMsg : m))
        );
      }
    },
    [currentUserId, targetUserId, supabase, scrollToBottom, status, isSenderState, friendshipId]
  );

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const msgText = newMessage.trim();
      if (!msgText || isSendingLocked) return;

      setIsSendingLocked(true);
      setNewMessage("");
      await sendMessage(msgText);
      setIsSendingLocked(false);
    },
    [newMessage, isSendingLocked, sendMessage]
  );

  const handleRetry = useCallback(
    (msg: Message) => {
      sendMessage(msg.content, msg.id);
    },
    [sendMessage]
  );

  // ── 7. Enter key to send ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  // ── Render ──
  if (isLoading) {
    return (
      <div className="flex justify-center p-8 h-full items-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-full min-h-[420px] md:min-h-0 shadow-xl relative">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-slate-700 bg-cover bg-center border border-slate-600"
            style={{
              backgroundImage: targetAvatarUrl ? `url(${targetAvatarUrl})` : "none",
            }}
          />
          <div>
            <h3 className="text-sm font-black text-white">
              {targetName || "好友"}
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium">
              {status === "accepted" && "🟢 好友 · 可以自由對話"}
              {status === "pending" && isSenderState && "⏳ 等待對方接受您的初次洽詢"}
              {status === "pending" && !isSenderState && "👋 對方發起了洽詢"}
              {status === "none" && "⚡ 初次洽詢對象"}
              {status === "rejected" && "🔴 對話已關閉"}
            </p>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-950"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs font-bold text-center p-6">
            開始與 {targetName || "他"} 聊天吧！
            {status === "none" && (
              <span className="text-[10px] text-zinc-600 font-normal mt-1 block max-w-xs">
                您發送的第一則訊息將自動附帶「洽詢請求」，為防範騷擾，發送後需等候對方確認才能繼續對話。
              </span>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={isMe ? CHAT_BUBBLE_ROW_ME : CHAT_BUBBLE_ROW_THEM}
              >
                <div className={`flex items-end gap-2 w-full ${isMe ? "justify-end" : "justify-start"}`}>
                  {msg.isError && (
                    <button
                      onClick={() => handleRetry(msg)}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors shrink-0 mb-1"
                      title="點擊重試"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                  <div
                    className={`
                      ${isMe ? CHAT_BUBBLE_ME : CHAT_BUBBLE_THEM}
                      ${msg.isSending ? "opacity-60" : "opacity-100"}
                      ${msg.isError ? "!bg-red-900/40 !border-red-700" : ""}
                      transition-opacity duration-200
                    `}
                  >
                    {msg.content}
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 mt-1 font-medium px-1">
                  {msg.isSending
                    ? "傳送中..."
                    : msg.isError
                    ? "傳送失敗 — 點擊重試"
                    : new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input / Anti-Spam Control Area */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        
        {/* State 1: Locked waiting for receiver acceptance */}
        {status === "pending" && isSenderState && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <p className="text-xs text-amber-400 font-bold">⏳ 洽詢訊息已發送</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">請等候對方接受您的洽詢後，即可繼續發送訊息。</p>
          </div>
        )}

        {/* State 2: Action Needed for Receiver */}
        {status === "pending" && !isSenderState && (
          <div className="mb-2 p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-xl flex items-center justify-between gap-3">
            <span className="text-xs text-blue-200 font-medium pl-1">
              👋 對方發起了諮詢，直接回覆或點擊接受：
            </span>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={handleManualAccept} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-lg transition flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 接受
              </button>
              <button onClick={handleManualReject} className="px-2.5 py-1 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 text-xs font-bold rounded-lg transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* State 3: Rejected / Closed */}
        {status === "rejected" && (
          <div className="p-3 bg-slate-900 border border-red-500/20 rounded-xl text-center">
            <p className="text-xs text-red-400 font-bold">🚫 此對話已關閉</p>
          </div>
        )}

        {/* State 4: Active Input Bar (Allowed for 'accepted', 'none', or Receiver of 'pending') */}
        {(status === "accepted" || status === "none" || (status === "pending" && !isSenderState)) && (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={status === "none" ? "輸入初次洽詢訊息..." : "輸入訊息..."}
              maxLength={2000}
              className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm sm:text-[15px] text-white focus:outline-none focus:border-blue-500 transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSendingLocked}
              className="w-12 h-12 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white flex items-center justify-center rounded-xl transition-colors shrink-0"
            >
              {isSendingLocked ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
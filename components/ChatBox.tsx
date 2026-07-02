"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Send, Loader2, AlertCircle, RefreshCw } from "lucide-react";

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
}

const PAGE_SIZE = 50;

export function ChatBox({
  currentUserId,
  targetUserId,
  targetAvatarUrl,
  targetName,
}: ChatBoxProps) {
  // ── Stable supabase client (never recreated on re-render) ──
  const supabase = useRef(createSupabaseBrowserClient()).current;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSendingLocked, setIsSendingLocked] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesLengthRef = useRef(0); // avoids stale closure in loadMessages

  const scrollToBottom = useCallback((delay = 50) => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, delay);
  }, []);

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

        // Mark received messages as read
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  // ── 4. Infinite scroll (scroll to top triggers load more) ──
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
            // Replace optimistic temp message if it exists
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
            // Deduplicate before appending
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Auto-mark as read if we are the receiver
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

  // ── 6. Optimistic send with retry ──
  const sendMessage = useCallback(
    async (msgText: string, retryTempId?: string) => {
      const tempId = retryTempId ?? `temp-${Date.now()}`;

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
        // Reset error state on retry
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
        // Realtime will handle the replacement — but as a fallback, do it here too
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? insertedMsg : m))
        );
      }
    },
    [currentUserId, targetUserId, supabase, scrollToBottom]
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
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-[450px] md:h-full shadow-xl relative">
      
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm z-10 shrink-0">
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
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            在線
          </p>
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-950"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-bold">
            開始與 {targetName || "他"} 聊天吧！
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2">
                  {msg.isError && (
                    <button
                      onClick={() => handleRetry(msg)}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                      title="點擊重試"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                  <div
                    className={`
                      max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium
                      ${isMe
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700"
                      }
                      ${msg.isSending ? "opacity-60" : "opacity-100"}
                      ${msg.isError ? "bg-red-900/40 border border-red-700" : ""}
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

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入訊息..."
          maxLength={2000}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || isSendingLocked}
          className="w-11 h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white flex items-center justify-center rounded-xl transition-colors shrink-0"
        >
          {isSendingLocked ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4 ml-0.5" />
          )}
        </button>
      </form>
    </div>
  );
}
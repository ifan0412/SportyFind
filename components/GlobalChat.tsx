"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MessageCircle, X, ChevronLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  CHAT_BUBBLE_ME,
  CHAT_BUBBLE_ROW_ME,
  CHAT_BUBBLE_ROW_THEM,
  CHAT_BUBBLE_THEM,
} from "@/components/chat/styles";
import { ConversationPreview } from "@/components/chat/ConversationPreview";
import {
  applyMessageInsert,
  clearUnreadForPeer,
  loadConversationSummaries,
  sortPeerIdsByRecent,
  totalUnreadCount,
  type ConversationSummary,
} from "@/lib/chat-summaries";

interface Friend {
  id: string;
  name: string;
  avatar_url: string | null;
  friendship_id: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  isSending?: boolean;
  isError?: boolean;
}

export function GlobalChat() {
  const supabase = createSupabaseBrowserClient();
  const pathname = usePathname();
  const isInboxPage = pathname === "/inbox" || pathname.startsWith("/inbox/");

  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ConversationSummary>>({});
  const [activeChat, setActiveChat] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<Friend | null>(null);
  const isOpenRef = useRef(false);
  const friendIdsRef = useRef<string[]>([]);

  activeChatRef.current = activeChat;
  isOpenRef.current = isOpen;
  friendIdsRef.current = friends.map((f) => f.id);

  const unreadTotal = useMemo(() => totalUnreadCount(summaries), [summaries]);

  const sortedFriends = useMemo(() => {
    const ids = sortPeerIdsByRecent(
      friends.map((f) => f.id),
      summaries
    );
    return ids.map((id) => friends.find((f) => f.id === id)!).filter(Boolean);
  }, [friends, summaries]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  const appendMessage = useCallback(
    (newMsg: Message) => {
      setMessages((prev) => {
        const tempIndex = prev.findIndex(
          (m) => m.isSending && m.content === newMsg.content && m.sender_id === newMsg.sender_id
        );
        if (tempIndex !== -1) {
          const updated = [...prev];
          updated[tempIndex] = newMsg;
          return updated;
        }
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const refreshSummaries = useCallback(
    async (userId: string, peerIds: string[]) => {
      if (peerIds.length === 0) {
        setSummaries({});
        return;
      }
      const next = await loadConversationSummaries(supabase, userId, peerIds);
      setSummaries(next);
    },
    [supabase]
  );

  const loadFriends = useCallback(
    async (userId: string) => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select(`
          id, sender_id, receiver_id,
          sender:sender_id   (id, full_name, avatar_url),
          receiver:receiver_id (id, full_name, avatar_url)
        `)
        .eq("status", "accepted")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      if (friendships) {
        const friendList = friendships.map((f: any) => {
          const isSender = f.sender_id === userId;
          const friendData = isSender ? f.receiver : f.sender;
          return {
            id: friendData.id,
            name: friendData.full_name || "未知使用者",
            avatar_url: friendData.avatar_url,
            friendship_id: f.id,
          };
        });
        setFriends(friendList);
        await refreshSummaries(
          userId,
          friendList.map((f) => f.id)
        );
      }
    },
    [supabase, refreshSummaries]
  );

  const markChatAsRead = useCallback(
    async (userId: string, chat: Friend) => {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", chat.id)
        .eq("receiver_id", userId)
        .eq("is_read", false);

      setSummaries((prev) => clearUnreadForPeer(prev, chat.id));
    },
    [supabase]
  );

  const loadChatMessages = useCallback(
    async (userId: string, chat: Friend) => {
      setIsLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${chat.id}),` +
            `and(sender_id.eq.${chat.id},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data);
        scrollToBottom();
      }
      setIsLoading(false);

      await markChatAsRead(userId, chat);
    },
    [supabase, scrollToBottom, markChatAsRead]
  );

  useEffect(() => {
    const initData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);
      await loadFriends(user.id);
    };
    initData();
  }, [supabase, loadFriends]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`global-msgs-${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          const uid = currentUser.id;
          const isMine = newMsg.sender_id === uid || newMsg.receiver_id === uid;
          if (!isMine) return;

          const chat = activeChatRef.current;
          const panelOpen = isOpenRef.current;
          const isActiveChat =
            chat &&
            ((newMsg.sender_id === uid && newMsg.receiver_id === chat.id) ||
              (newMsg.sender_id === chat.id && newMsg.receiver_id === uid));

          const skipUnread = Boolean(isActiveChat && panelOpen);

          setSummaries((prev) =>
            applyMessageInsert(prev, uid, newMsg, { skipUnreadIncrement: skipUnread })
          );

          if (isActiveChat && panelOpen) {
            appendMessage(newMsg);
            if (newMsg.sender_id !== uid) {
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", newMsg.id)
                .then(() => {
                  setSummaries((prev) => clearUnreadForPeer(prev, chat!.id));
                });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          if (currentUser) {
            refreshSummaries(currentUser.id, friendIdsRef.current);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, supabase, appendMessage, refreshSummaries]);

  useEffect(() => {
    const onSync = async () => {
      if (!currentUser) return;
      await refreshSummaries(currentUser.id, friendIdsRef.current);
    };
    window.addEventListener("chat-message-sync", onSync);
    return () => window.removeEventListener("chat-message-sync", onSync);
  }, [currentUser, refreshSummaries]);

  useEffect(() => {
    if (!activeChat || !currentUser || !isOpen) return;
    loadChatMessages(currentUser.id, activeChat);
  }, [activeChat, currentUser, isOpen, loadChatMessages]);

  const handleOpenChat = (friend: Friend) => {
    setSummaries((prev) => clearUnreadForPeer(prev, friend.id));
    setActiveChat(friend);
  };

  const handleBackToList = () => {
    setActiveChat(null);
    if (currentUser) {
      refreshSummaries(currentUser.id, friendIdsRef.current);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !currentUser) return;

    const msgText = newMessage.trim();
    setNewMessage("");

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: activeChat.id,
      content: msgText,
      is_read: false,
      created_at: new Date().toISOString(),
      isSending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setSummaries((prev) =>
      applyMessageInsert(prev, currentUser.id, tempMsg, { skipUnreadIncrement: true })
    );
    scrollToBottom();

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ sender_id: currentUser.id, receiver_id: activeChat.id, content: msgText })
      .select()
      .single();

    if (error || !inserted) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, isSending: false, isError: true } : m))
      );
      return;
    }

    setMessages((prev) => prev.map((m) => (m.id === tempId ? inserted : m)));
    setSummaries((prev) => {
      const withoutTemp = { ...prev };
      return applyMessageInsert(withoutTemp, currentUser.id, inserted, { skipUnreadIncrement: true });
    });
    scrollToBottom();
    window.dispatchEvent(new CustomEvent("chat-message-sync"));
  };

  if (!currentUser) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex-col items-end ${
        isInboxPage ? "hidden md:flex" : "flex"
      }`}
    >
      {isOpen && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[min(100vw-2rem,28rem)] sm:w-96 h-[min(100vh-8rem,520px)] mb-4 flex flex-col overflow-hidden animate-fadeIn">
          <div className="bg-slate-800 p-3 flex justify-between items-center border-b border-slate-700 shrink-0">
            {activeChat ? (
              <div className="flex items-center gap-2">
                <button onClick={handleBackToList} className="text-slate-400 hover:text-white transition">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div
                  className="w-6 h-6 rounded-full bg-slate-700 bg-cover bg-center border border-slate-600"
                  style={{ backgroundImage: activeChat.avatar_url ? `url(${activeChat.avatar_url})` : "none" }}
                />
                <span className="text-sm font-black text-white">{activeChat.name}</span>
              </div>
            ) : (
              <span className="text-sm font-black text-white px-1">訊息</span>
            )}

            <div className="flex items-center gap-2">
              {!activeChat && (
                <Link
                  href="/inbox"
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] bg-slate-700 hover:bg-blue-600 text-white px-2 py-1 rounded font-bold transition"
                >
                  全螢幕收件匣
                </Link>
              )}
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!activeChat ? (
            <div className="flex-1 overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:hidden bg-slate-950">
              {sortedFriends.length === 0 ? (
                <div className="p-4 text-center text-xs font-bold text-slate-500 mt-10">尚無好友可傳送訊息</div>
              ) : (
                sortedFriends.map((friend) => (
                  <ConversationPreview
                    key={friend.id}
                    name={friend.name}
                    avatarUrl={friend.avatar_url}
                    summary={summaries[friend.id]}
                    isActive={false}
                    onClick={() => handleOpenChat(friend)}
                    avatarSize="sm"
                  />
                ))
              )}
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-950">
                {isLoading ? (
                  <div className="flex justify-center mt-10">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs font-bold text-slate-500 mt-10">打個招呼吧！</div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser.id;
                    return (
                      <div key={msg.id} className={isMe ? CHAT_BUBBLE_ROW_ME : CHAT_BUBBLE_ROW_THEM}>
                        <div
                          className={`${isMe ? CHAT_BUBBLE_ME : CHAT_BUBBLE_THEM} ${msg.isSending ? "opacity-60" : "opacity-100"}`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 px-1">
                          {msg.isSending
                            ? "傳送中..."
                            : msg.isError
                              ? "傳送失敗"
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

              <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="輸入訊息..."
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-11 h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white flex items-center justify-center rounded-xl transition shrink-0"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-105 transition-all duration-300"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!isOpen && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full border-2 border-slate-950 shadow-lg">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        )}
      </button>
    </div>
  );
}

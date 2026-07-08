"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChatBox } from "@/components/ChatBox";
import { ConversationPreview } from "@/components/chat/ConversationPreview";
import { ArrowLeft, Loader2, X } from "lucide-react";
import {
  applyMessageInsert,
  clearUnreadForPeer,
  loadConversationSummaries,
  sortPeerIdsByRecent,
  type ConversationSummary,
} from "@/lib/chat-summaries";

interface InboxContact {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  handle?: string | null;
  friendshipStatus: string;
  isSender?: boolean;
}

function InboxPageContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("to");

  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<InboxContact[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ConversationSummary>>({});
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const activeFriendIdRef = useRef<string | null>(null);
  const peerIdsRef = useRef<string[]>([]);
  const isInitialLoadRef = useRef(true);

  activeFriendIdRef.current = activeFriendId;
  peerIdsRef.current = conversations.map((c) => c.id);

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

  const fetchInbox = useCallback(async () => {
    if (isInitialLoadRef.current) setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const { data: friendships } = await supabase
        .from("friendships")
        .select(`
          id, status, sender_id, receiver_id,
          sender:sender_id (id, full_name, avatar_url, handle),
          receiver:receiver_id (id, full_name, avatar_url, handle)
        `)
        .in("status", ["accepted", "pending"])
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      let contactList: InboxContact[] = [];
      if (friendships) {
        contactList = friendships.map((f: any) => {
          const profile = f.sender_id === user.id ? f.receiver : f.sender;
          return {
            ...profile,
            friendshipStatus: f.status,
            isSender: f.sender_id === user.id,
          };
        });
      }

      if (targetId && targetId !== user.id && !contactList.some((c) => c.id === targetId)) {
        const { data: targetProfile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, handle")
          .eq("id", targetId)
          .single();

        if (targetProfile) {
          contactList.unshift({
            ...targetProfile,
            friendshipStatus: "none",
          });
        }
      }

      setConversations(contactList);
      await refreshSummaries(
        user.id,
        contactList.map((c) => c.id)
      );

      setActiveFriendId((prev) => {
        if (targetId) return targetId;
        if (prev && contactList.some((c) => c.id === prev)) return prev;
        return null;
      });
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [supabase, targetId, refreshSummaries]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  useEffect(() => {
    document.body.dataset.inboxMobile = "true";
    return () => {
      delete document.body.dataset.inboxMobile;
    };
  }, []);

  useEffect(() => {
    const onFriendshipSync = () => {
      fetchInbox();
    };
    const onMessageSync = () => {
      if (currentUser) {
        refreshSummaries(currentUser.id, peerIdsRef.current);
      }
    };
    window.addEventListener("sync-friendship", onFriendshipSync);
    window.addEventListener("chat-message-sync", onMessageSync);
    return () => {
      window.removeEventListener("sync-friendship", onFriendshipSync);
      window.removeEventListener("chat-message-sync", onMessageSync);
    };
  }, [fetchInbox, refreshSummaries, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`inbox-msgs-${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as {
            sender_id: string;
            receiver_id: string;
            content: string;
            created_at: string;
            is_read: boolean;
          };
          const uid = currentUser.id;
          if (newMsg.sender_id !== uid && newMsg.receiver_id !== uid) return;

          const activeId = activeFriendIdRef.current;
          const peerId = newMsg.sender_id === uid ? newMsg.receiver_id : newMsg.sender_id;
          const skipUnread = activeId === peerId;

          setSummaries((prev) =>
            applyMessageInsert(prev, uid, newMsg, { skipUnreadIncrement: skipUnread })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          refreshSummaries(currentUser.id, peerIdsRef.current);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, supabase, refreshSummaries]);

  const sortedConversations = useMemo(() => {
    const ids = sortPeerIdsByRecent(
      conversations.map((c) => c.id),
      summaries
    );
    return ids.map((id) => conversations.find((c) => c.id === id)!).filter(Boolean);
  }, [conversations, summaries]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-950 flex flex-col items-center justify-center text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-zinc-400" />
        <p className="text-sm font-bold">載入收件匣中...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-950 flex flex-col items-center justify-center text-zinc-500">
        <p className="text-sm font-bold">請先登入以使用收件匣</p>
      </div>
    );
  }

  const activeContact = conversations.find((c) => c.id === activeFriendId);
  const showMobileChat = Boolean(activeFriendId && activeContact);

  const handleRejected = () => {
    setActiveFriendId(null);
    fetchInbox();
  };

  const handleSelectContact = (contactId: string) => {
    setSummaries((prev) => clearUnreadForPeer(prev, contactId));
    setActiveFriendId(contactId);
  };

  const statusSubtitle = (contact: InboxContact) => {
    if (contact.friendshipStatus === "pending") {
      return (
        <p className="text-[10px] text-amber-400 font-bold mt-0.5 truncate">
          ⏳ {contact.isSender ? "已發送洽詢" : "收到新請求"}
        </p>
      );
    }
    if (contact.friendshipStatus === "none") {
      return <p className="text-[10px] text-emerald-400 font-bold mt-0.5 truncate">⚡ 初次洽詢對象</p>;
    }
    return null;
  };

  return (
    <div className="bg-slate-950 h-[calc(100dvh-3.5rem-4rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-3.5rem)] overflow-hidden">
      <div className="md:hidden flex items-center justify-between px-4 h-12 border-b border-slate-800 bg-slate-950">
        <h1 className="text-sm font-black text-white">訊息收件匣</h1>
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="關閉收件匣"
          className="flex items-center justify-center w-9 h-9 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="h-[calc(100%-3rem)] md:h-full px-3 py-3 sm:px-6 sm:py-4 overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 md:gap-6 h-full">
        <div
          className={`w-full md:w-1/3 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col shadow-xl ${
            showMobileChat ? "hidden md:flex" : "flex h-full"
          } md:h-full`}
        >
          <h2 className="hidden md:block text-xl font-black text-white mb-4 px-2">訊息收件匣</h2>
          <div className="flex-1 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:hidden">
            {sortedConversations.length === 0 ? (
              <p className="text-zinc-500 text-sm font-bold text-center mt-10">尚無任何對話紀錄</p>
            ) : (
              sortedConversations.map((contact) => (
                  <ConversationPreview
                    key={contact.id}
                    name={contact.full_name || "未知使用者"}
                    avatarUrl={contact.avatar_url}
                    summary={summaries[contact.id]}
                    subtitle={
                      contact.friendshipStatus !== "accepted" && !summaries[contact.id]?.lastMessage
                        ? statusSubtitle(contact) ?? undefined
                        : undefined
                    }
                    isActive={activeFriendId === contact.id}
                    onClick={() => handleSelectContact(contact.id)}
                  />
              ))
            )}
          </div>
        </div>

        <div className={`w-full md:w-2/3 flex-1 min-h-0 ${showMobileChat ? "flex" : "hidden md:flex"}`}>
          {activeFriendId && activeContact ? (
            <div className="flex flex-col h-full w-full min-h-0">
              <button
                type="button"
                onClick={() => setActiveFriendId(null)}
                className="md:hidden flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white mb-3 px-1 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                返回對話列表
              </button>
              <div className="flex-1 min-h-0">
                <ChatBox
                  currentUserId={currentUser.id}
                  targetUserId={activeFriendId}
                  targetName={activeContact.full_name || undefined}
                  targetAvatarUrl={activeContact.avatar_url || undefined}
                  friendshipStatus={activeContact.friendshipStatus}
                  isSender={activeContact.isSender}
                  onRejected={handleRejected}
                />
              </div>
            </div>
          ) : (
            <div className="h-full w-full bg-slate-950 md:bg-slate-900 md:border md:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-zinc-500">
              <span className="text-4xl mb-4">💬</span>
              <p className="font-bold text-sm md:text-base">請選擇對話以開始</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100dvh-3.5rem)] bg-slate-950 flex flex-col items-center justify-center text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-zinc-400" />
          <p className="text-sm font-bold">載入中...</p>
        </div>
      }
    >
      <InboxPageContent />
    </Suspense>
  );
}

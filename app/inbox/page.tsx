"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChatBox } from "@/components/ChatBox";
import { ArrowLeft } from "lucide-react";

function InboxPageContent() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("to");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);

  const fetchInbox = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
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

    let contactList: any[] = [];
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

    setActiveFriendId((prev) => {
      if (targetId) return targetId;
      if (prev && contactList.some((c) => c.id === prev)) return prev;
      return contactList.length > 0 ? contactList[0].id : null;
    });
  }, [supabase, targetId]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  useEffect(() => {
    const onSync = () => {
      fetchInbox();
    };
    window.addEventListener("sync-friendship", onSync);
    return () => window.removeEventListener("sync-friendship", onSync);
  }, [fetchInbox]);

  if (!currentUser) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入收件匣中...</div>;
  }

  const activeContact = conversations.find((c) => c.id === activeFriendId);
  const showMobileChat = Boolean(activeFriendId && activeContact);

  const handleRejected = () => {
    setActiveFriendId(null);
    fetchInbox();
  };

  return (
    <div className="bg-slate-950 min-h-[calc(100dvh-3.5rem)] py-4 px-3 sm:py-6 sm:px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 md:gap-6 h-[calc(100dvh-6rem)] md:h-[80vh]">
        <div
          className={`w-full md:w-1/3 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col shadow-xl ${
            showMobileChat ? "hidden md:flex" : "flex h-full"
          } md:h-full`}
        >
          <h2 className="text-xl font-black text-white mb-4 px-2">訊息收件匣</h2>
          <div className="flex-1 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden">
            {conversations.length === 0 ? (
              <p className="text-zinc-500 text-sm font-bold text-center mt-10">尚無任何對話紀錄</p>
            ) : (
              conversations.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setActiveFriendId(contact.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    activeFriendId === contact.id
                      ? "bg-blue-600/20 border border-blue-500/30"
                      : "bg-slate-950/50 hover:bg-slate-800 border border-slate-800/50"
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full bg-slate-700 bg-cover bg-center shrink-0 border-2 border-slate-600 relative"
                    style={{ backgroundImage: contact.avatar_url ? `url(${contact.avatar_url})` : "none" }}
                  >
                    {!contact.avatar_url && (
                      <span className="w-full h-full flex items-center justify-center font-black text-zinc-500">
                        {contact.full_name?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-black truncate ${activeFriendId === contact.id ? "text-blue-400" : "text-white"}`}>
                        {contact.full_name}
                      </p>
                    </div>
                    {contact.friendshipStatus === "pending" && (
                      <p className="text-[10px] text-amber-400 font-bold mt-0.5">
                        ⏳ {contact.isSender ? "已發送洽詢" : "收到新請求"}
                      </p>
                    )}
                    {contact.friendshipStatus === "none" && (
                      <p className="text-[10px] text-emerald-400 font-bold mt-0.5">⚡ 初次洽詢對象</p>
                    )}
                    {contact.friendshipStatus === "accepted" && (
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5">點擊查看對話</p>
                    )}
                  </div>
                </button>
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
                  targetName={activeContact.full_name}
                  targetAvatarUrl={activeContact.avatar_url}
                  friendshipStatus={activeContact.friendshipStatus}
                  isSender={activeContact.isSender}
                  onRejected={handleRejected}
                />
              </div>
            </div>
          ) : (
            <div className="h-full bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-zinc-500">
              <span className="text-4xl mb-4">📫</span>
              <p className="font-bold">請從左側選擇一個對話開始</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入中...</div>}>
      <InboxPageContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChatBox } from "@/components/ChatBox";

function InboxPageContent() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("to"); // 🔥 1. 抓取網址中的 ?to=UUID

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInbox = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // 🔥 2. 抓取「已接受」與「審核中(Pending)」的好友/對話
      const { data: friendships } = await supabase
        .from("friendships")
        .select(`
          id, status, sender_id, receiver_id,
          sender:sender_id (id, full_name, avatar_url, handle),
          receiver:receiver_id (id, full_name, avatar_url, handle)
        `)
        .in("status", ["accepted", "pending"]) // 允許查看 pending 請求
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      let contactList: any[] = [];
      if (friendships) {
        contactList = friendships.map((f: any) => {
          const profile = f.sender_id === user.id ? f.receiver : f.sender;
          return {
            ...profile,
            friendshipStatus: f.status,
            isSender: f.sender_id === user.id
          };
        });
      }

      // 🔥 3. 如果網址有 ?to=UUID，但對方還不在對話列表中（非好友），手動抓取對方檔案並塞入列表第一筆！
      if (targetId && targetId !== user.id && !contactList.some(c => c.id === targetId)) {
        const { data: targetProfile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, handle")
          .eq("id", targetId)
          .single();

        if (targetProfile) {
          contactList.unshift({
            ...targetProfile,
            friendshipStatus: "none" // 標記為非好友初次洽詢
          });
        }
      }

      setConversations(contactList);

      // 🔥 4. 如果有 ?to=UUID 參數，立刻自動選取並開啟該對話！
      if (targetId) {
        setActiveFriendId(targetId);
      } else if (contactList.length > 0 && !activeFriendId) {
        setActiveFriendId(contactList[0].id);
      }
    };

    fetchInbox();
  }, [supabase, targetId]);

  if (!currentUser) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入收件匣中...</div>;

  const activeContact = conversations.find(c => c.id === activeFriendId);

  return (
    <div className="bg-slate-950 min-h-[calc(100vh-3.5rem)] py-6 px-4 md:px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 h-[80vh]">
        
        {/* 左側：對話列表 */}
        <div className="w-full md:w-1/3 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col h-[40vh] md:h-full shadow-xl">
          <h2 className="text-xl font-black text-white mb-4 px-2">訊息收件匣</h2>
          <div className="flex-1 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden">
            {conversations.length === 0 ? (
              <p className="text-zinc-500 text-sm font-bold text-center mt-10">尚無任何對話紀錄</p>
            ) : (
              conversations.map(contact => (
                <button 
                  key={contact.id} 
                  onClick={() => setActiveFriendId(contact.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    activeFriendId === contact.id ? "bg-blue-600/20 border border-blue-500/30" : "bg-slate-950/50 hover:bg-slate-800 border border-slate-800/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-700 bg-cover bg-center shrink-0 border-2 border-slate-600 relative" style={{ backgroundImage: contact.avatar_url ? `url(${contact.avatar_url})` : "none" }}>
                    {!contact.avatar_url && <span className="w-full h-full flex items-center justify-center font-black text-zinc-500">{contact.full_name?.[0]}</span>}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-black truncate ${activeFriendId === contact.id ? "text-blue-400" : "text-white"}`}>{contact.full_name}</p>
                    </div>
                    {/* 狀態標籤提示 */}
                    {contact.friendshipStatus === "pending" && (
                      <p className="text-[10px] text-amber-400 font-bold mt-0.5">⏳ {contact.isSender ? "已發送洽詢" : "收到新請求"}</p>
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

        {/* 右側：聊天視窗 */}
        <div className="w-full md:w-2/3 h-[50vh] md:h-full">
          {activeFriendId && activeContact ? (
            <ChatBox 
              currentUserId={currentUser.id} 
              targetUserId={activeFriendId} 
              targetName={activeContact.full_name}
              targetAvatarUrl={activeContact.avatar_url}
              // 🔥 傳入狀態給 ChatBox 處理 anti-spam 鎖定邏輯
              friendshipStatus={activeContact.friendshipStatus} 
              isSender={activeContact.isSender}
            />
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

// Next.js App Router 需要以 Suspense 包覆使用 useSearchParams 的元件
export default function InboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入中...</div>}>
      <InboxPageContent />
    </Suspense>
  );
}
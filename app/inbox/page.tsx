"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChatBox } from "@/components/ChatBox"; // ✅ 直接重複利用你前一步寫好的 ChatBox！

export default function InboxPage() {
  const supabase = createSupabaseBrowserClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const { data: friendships } = await supabase
        .from("friendships")
        .select(`id, sender_id, receiver_id, sender:sender_id (id, full_name, avatar_url), receiver:receiver_id (id, full_name, avatar_url)`)
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (friendships) {
        setFriends(friendships.map((f: any) => f.sender_id === user.id ? f.receiver : f.sender));
      }
    };
    fetchFriends();
  }, [supabase]);

  if (!currentUser) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入中...</div>;

  return (
    <div className="bg-slate-950 min-h-[calc(100vh-3.5rem)] py-6 px-4 md:px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 h-[80vh]">
        
        {/* 左側：好友列表 */}
        <div className="w-full md:w-1/3 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col h-[40vh] md:h-full">
          <h2 className="text-xl font-black text-white mb-4 px-2">訊息收件匣</h2>
          <div className="flex-1 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden">
            {friends.length === 0 ? (
              <p className="text-zinc-500 text-sm font-bold text-center mt-10">尚無好友可聊天</p>
            ) : (
              friends.map(friend => (
                <button 
                  key={friend.id} 
                  onClick={() => setActiveFriendId(friend.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeFriendId === friend.id ? "bg-blue-600/20 border border-blue-500/30" : "bg-slate-950/50 hover:bg-slate-800 border border-slate-800/50"}`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-700 bg-cover bg-center shrink-0 border-2 border-slate-600" style={{ backgroundImage: friend.avatar_url ? `url(${friend.avatar_url})` : "none" }} />
                  <div className="text-left">
                    <p className={`text-sm font-black ${activeFriendId === friend.id ? "text-blue-400" : "text-white"}`}>{friend.full_name}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-bold">點擊查看對話</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 右側：聊天視窗 */}
        <div className="w-full md:w-2/3 h-[50vh] md:h-full">
          {activeFriendId ? (
            <ChatBox 
              currentUserId={currentUser.id} 
              targetUserId={activeFriendId} 
              targetName={friends.find(f => f.id === activeFriendId)?.full_name}
              targetAvatarUrl={friends.find(f => f.id === activeFriendId)?.avatar_url}
            />
          ) : (
            <div className="h-full bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-zinc-500">
              <span className="text-4xl mb-4">📫</span>
              <p className="font-bold">請從左側選擇一位好友開始聊天</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeSupabaseQuery } from "@/lib/supabase/safe-query";
import { sharePreviewText } from "@/lib/share-payload";

export type ConversationSummary = {
  peerId: string;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageFromMe: boolean;
};

export function formatMessagePreview(content: string | null, fromMe: boolean): string {
  if (!content?.trim()) return "尚無訊息，點擊開始聊天…";
  const shareText = sharePreviewText(content, fromMe);
  if (shareText) return shareText;
  const prefix = fromMe ? "你: " : "";
  const text = content.trim();
  const clipped = text.length > 42 ? `${text.slice(0, 41)}…` : text;
  return `${prefix}${clipped}`;
}

export function formatMessageTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "numeric", day: "numeric" });
}

export async function loadConversationSummaries(
  supabase: SupabaseClient,
  userId: string,
  peerIds: string[]
): Promise<Record<string, ConversationSummary>> {
  if (peerIds.length === 0) return {};

  const [{ data: unreadRows }, { data: recentMsgs }] = await Promise.all([
    safeSupabaseQuery(
      supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", userId)
        .eq("is_read", false)
        .in("sender_id", peerIds)
    ),
    safeSupabaseQuery(
      supabase
        .from("messages")
        .select("sender_id, receiver_id, content, created_at")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(Math.max(peerIds.length * 4, 80))
    ),
  ]);

  const unreadByPeer: Record<string, number> = {};
  for (const row of unreadRows || []) {
    unreadByPeer[row.sender_id] = (unreadByPeer[row.sender_id] || 0) + 1;
  }

  const lastByPeer: Record<string, { content: string; created_at: string; fromMe: boolean }> = {};
  for (const msg of recentMsgs || []) {
    const peerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    if (!peerIds.includes(peerId) || lastByPeer[peerId]) continue;
    lastByPeer[peerId] = {
      content: msg.content,
      created_at: msg.created_at,
      fromMe: msg.sender_id === userId,
    };
  }

  const result: Record<string, ConversationSummary> = {};
  for (const peerId of peerIds) {
    const last = lastByPeer[peerId];
    result[peerId] = {
      peerId,
      unreadCount: unreadByPeer[peerId] || 0,
      lastMessage: last?.content ?? null,
      lastMessageAt: last?.created_at ?? null,
      lastMessageFromMe: last?.fromMe ?? false,
    };
  }
  return result;
}

export function applyMessageInsert(
  summaries: Record<string, ConversationSummary>,
  userId: string,
  msg: {
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
  },
  options?: { skipUnreadIncrement?: boolean }
): Record<string, ConversationSummary> {
  const peerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
  const prev = summaries[peerId] || {
    peerId,
    unreadCount: 0,
    lastMessage: null,
    lastMessageAt: null,
    lastMessageFromMe: false,
  };
  const incrementUnread =
    msg.receiver_id === userId && !msg.is_read && !options?.skipUnreadIncrement;

  return {
    ...summaries,
    [peerId]: {
      peerId,
      unreadCount: incrementUnread ? prev.unreadCount + 1 : prev.unreadCount,
      lastMessage: msg.content,
      lastMessageAt: msg.created_at,
      lastMessageFromMe: msg.sender_id === userId,
    },
  };
}

export function clearUnreadForPeer(
  summaries: Record<string, ConversationSummary>,
  peerId: string
): Record<string, ConversationSummary> {
  const prev = summaries[peerId];
  if (!prev || prev.unreadCount === 0) return summaries;
  return {
    ...summaries,
    [peerId]: { ...prev, unreadCount: 0 },
  };
}

export function totalUnreadCount(summaries: Record<string, ConversationSummary>): number {
  return Object.values(summaries).reduce((sum, s) => sum + s.unreadCount, 0);
}

export function sortPeerIdsByRecent(
  peerIds: string[],
  summaries: Record<string, ConversationSummary>
): string[] {
  return [...peerIds].sort((a, b) => {
    const at = summaries[a]?.lastMessageAt;
    const bt = summaries[b]?.lastMessageAt;
    if (!at && !bt) return 0;
    if (!at) return 1;
    if (!bt) return -1;
    return new Date(bt).getTime() - new Date(at).getTime();
  });
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type FriendProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  handle: string | null;
};

export async function fetchAcceptedFriends(
  supabase: SupabaseClient,
  userId: string
): Promise<FriendProfile[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
      sender_id,
      receiver_id,
      sender:sender_id (id, full_name, avatar_url, handle),
      receiver:receiver_id (id, full_name, avatar_url, handle)
    `
    )
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error || !data) return [];

  const friends: FriendProfile[] = [];
  for (const row of data) {
    const peerRaw =
      row.sender_id === userId ? row.receiver : row.sender;
    const peer = Array.isArray(peerRaw) ? peerRaw[0] : peerRaw;
    if (peer && typeof peer === "object" && "id" in peer && typeof peer.id === "string") {
      friends.push(peer as FriendProfile);
    }
  }

  return friends.sort((a, b) =>
    (a.full_name || "").localeCompare(b.full_name || "", "zh-Hant")
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";

type FriendshipRow = {
  id: string;
  status: string;
  sender_id: string;
  receiver_id: string;
};

/**
 * Send or re-send a friend request. For rejected friendships, deletes the old row
 * and inserts a fresh pending request so RLS and sender/receiver swaps stay valid.
 */
export async function reopenOrSendFriendRequest(
  supabase: SupabaseClient,
  currentUserId: string,
  targetUserId: string
): Promise<{ friendshipId: string | null; error: { message: string; code?: string } | null }> {
  if (currentUserId === targetUserId) {
    return { friendshipId: null, error: { message: "Cannot friend yourself" } };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("friendships")
    .select("id, status, sender_id, receiver_id")
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),` +
        `and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (fetchErr) {
    return { friendshipId: null, error: { message: fetchErr.message, code: fetchErr.code } };
  }

  const row = existing as FriendshipRow | null;

  if (row?.status === "accepted" || row?.status === "pending") {
    return { friendshipId: row.id, error: null };
  }

  if (row) {
    const { error: delErr } = await supabase.from("friendships").delete().eq("id", row.id);
    if (delErr) {
      if (row.sender_id === currentUserId) {
        const { error: updErr } = await supabase
          .from("friendships")
          .update({ status: "pending" })
          .eq("id", row.id);
        if (!updErr) return { friendshipId: row.id, error: null };
      }
      return { friendshipId: null, error: { message: delErr.message, code: delErr.code } };
    }
  }

  const { data: inserted, error: insErr } = await supabase
    .from("friendships")
    .insert({ sender_id: currentUserId, receiver_id: targetUserId, status: "pending" })
    .select("id")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      const { data: retry } = await supabase
        .from("friendships")
        .select("id")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),` +
            `and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`
        )
        .maybeSingle();
      if (retry?.id) return { friendshipId: retry.id, error: null };
    }
    return { friendshipId: null, error: { message: insErr.message, code: insErr.code } };
  }

  return { friendshipId: inserted.id, error: null };
}

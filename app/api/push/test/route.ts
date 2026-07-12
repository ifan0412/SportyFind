import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTestPushToUser } from "@/lib/push/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count) {
    return NextResponse.json({ error: "尚未訂閱推送通知" }, { status: 400 });
  }

  const result = await sendTestPushToUser(user.id);
  if (result.sent === 0) {
    return NextResponse.json({ error: "推送發送失敗，請檢查 VAPID 設定" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, sent: result.sent });
}

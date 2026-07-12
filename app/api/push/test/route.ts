import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVapidPublicKey, sendTestPushToUser } from "@/lib/push/server";
import { hasServiceRoleClient } from "@/lib/supabase/service";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getVapidPublicKey()) {
    return NextResponse.json({ error: "VAPID 公鑰未設定（Vercel 環境變數）" }, { status: 503 });
  }

  if (!hasServiceRoleClient()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY 未設定（Vercel 環境變數）" },
      { status: 503 }
    );
  }

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count) {
    return NextResponse.json(
      { error: "伺服器未記錄此裝置訂閱，請按「重新訂閱」" },
      { status: 400 }
    );
  }

  const result = await sendTestPushToUser(user.id);
  if (result.sent === 0) {
    return NextResponse.json(
      {
        error: "推送發送失敗（VAPID 私鑰或訂閱端點可能已失效）",
        sent: result.sent,
        failed: result.failed,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, sent: result.sent, failed: result.failed });
}

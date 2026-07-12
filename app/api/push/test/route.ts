import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getVapidConfigurationError,
  getVapidPublicKey,
  isPushServerConfigured,
  isVapidPrivateKeyConfigured,
  sendTestPushToUser,
} from "@/lib/push/server";
import { hasServiceRoleClient } from "@/lib/supabase/service";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    if (!getVapidPublicKey()) {
      return NextResponse.json(
        { error: "VAPID 公鑰未設定（NEXT_PUBLIC_VAPID_PUBLIC_KEY）" },
        { status: 503 }
      );
    }

    if (!isVapidPrivateKeyConfigured()) {
      return NextResponse.json(
        { error: "VAPID 私鑰未設定（VAPID_PRIVATE_KEY）" },
        { status: 503 }
      );
    }

    const vapidError = getVapidConfigurationError();
    if (vapidError) {
      return NextResponse.json({ error: vapidError }, { status: 503 });
    }

    if (!hasServiceRoleClient()) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY 未設定" },
        { status: 503 }
      );
    }

    const { count, error: countError } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError?.code === "42P01") {
      return NextResponse.json(
        { error: "push_subscriptions 資料表不存在，請執行 Supabase migration 056" },
        { status: 503 }
      );
    }

    if (!count) {
      return NextResponse.json(
        { error: "伺服器未記錄此裝置訂閱，請按「重新訂閱」" },
        { status: 400 }
      );
    }

    if (!isPushServerConfigured()) {
      return NextResponse.json({ error: "推送伺服器設定不完整" }, { status: 503 });
    }

    const result = await sendTestPushToUser(user.id);
    if (result.sent === 0) {
      return NextResponse.json(
        {
          error: result.lastError ?? "推送發送失敗，請按「重新訂閱」後再試",
          sent: result.sent,
          failed: result.failed,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, sent: result.sent, failed: result.failed });
  } catch (err) {
    console.error("Push test route error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "推送測試時發生伺服器錯誤",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string };
  const phone = body.phone?.trim();

  if (!phone || phone.length < 8) {
    return NextResponse.json({ error: "無效的電話號碼" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { data: checkData, error: checkError } = await supabase.rpc("check_phone_otp_send_allowed", {
    p_phone_e164: phone,
  });

  if (checkError) {
    return NextResponse.json(
      { error: checkError.message.includes("check_phone_otp_send_allowed") ? "請先在 Supabase 執行 migration 047_phone_otp_rate_limits.sql" : checkError.message },
      { status: 500 }
    );
  }

  const check = checkData as {
    allowed?: boolean;
    message?: string;
    status?: string;
    cooldown_seconds?: number;
    attempts_remaining?: number;
  };

  if (!check?.allowed) {
    return NextResponse.json(
      {
        error: check.message || "無法發送驗證碼",
        status: check.status,
        cooldown_seconds: check.cooldown_seconds ?? 0,
        attempts_remaining: check.attempts_remaining ?? 0,
      },
      { status: 429 }
    );
  }

  const { error: sendError } = await supabase.auth.updateUser({ phone });

  if (sendError) {
    const msg = sendError.message.toLowerCase();
    let error = sendError.message;
    if (msg.includes("provider") || msg.includes("sms") || msg.includes("twilio")) {
      error =
        "SMS 服務尚未設定。請在 Supabase Dashboard → Authentication → Providers → Phone 啟用並連接 Twilio。";
    }
    return NextResponse.json({ error }, { status: 400 });
  }

  const { error: recordError } = await supabase.rpc("record_phone_otp_send", {
    p_phone_e164: phone,
  });

  if (recordError) {
    console.error("[send-otp] record failed:", recordError.message);
  }

  return NextResponse.json({
    success: true,
    attempts_remaining: Math.max(0, (check.attempts_remaining ?? 3) - 1),
  });
}

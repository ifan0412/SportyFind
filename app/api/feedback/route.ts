import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/send-email";
import { SITE } from "@/lib/site";

const MIN_MESSAGE = 10;
const MAX_MESSAGE = 5000;

const CATEGORY_LABELS: Record<string, string> = {
  feedback: "意見回饋",
  inquiry: "查詢",
  report: "舉報",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const category =
    typeof body.category === "string" && body.category in CATEGORY_LABELS
      ? body.category
      : "feedback";

  if (message.length < MIN_MESSAGE) {
    return NextResponse.json({ error: "請輸入至少 10 個字。" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "訊息過長，請精簡後再試。" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入後提交。" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const senderName =
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "會員";
  // Login/account email only — not the optional public contact_email on profile.
  const accountEmail = user.email ?? "未提供";

  const { data: submission, error: insertError } = await supabase
    .from("feedback_submissions")
    .insert({
      user_id: user.id,
      category,
      message,
      sender_name: senderName,
      sender_email: accountEmail,
    })
    .select("id")
    .single();

  if (insertError || !submission) {
    console.error("Feedback insert failed:", insertError);
    return NextResponse.json({ error: "提交失敗，請稍後再試。" }, { status: 500 });
  }

  const categoryLabel = CATEGORY_LABELS[category];
  // Sent from SportyFind system address (Resend), not the user's email.
  // User login email is included in the body so support can follow up.
  const emailResult = await sendEmail({
    to: SITE.supportEmail,
    subject: `[${SITE.name}] ${categoryLabel} — ${senderName}`,
    replyTo: user.email ?? undefined,
    html: `
      <div style="font-family:sans-serif;line-height:1.6;color:#0f172a;max-width:560px">
        <p style="color:#64748b;font-size:13px;margin:0 0 16px">
          此郵件由 ${SITE.name} 系統代為發送，並非直接來自用戶電郵地址。
        </p>
        <h2 style="color:#0f172a;margin:0 0 12px">${escapeHtml(categoryLabel)}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
          <tr><td style="padding:6px 0;color:#64748b;width:120px">姓名</td><td style="padding:6px 0">${escapeHtml(senderName)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">帳戶電郵</td><td style="padding:6px 0">${escapeHtml(accountEmail)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">用戶 ID</td><td style="padding:6px 0;font-family:monospace;font-size:12px">${user.id}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">提交 ID</td><td style="padding:6px 0;font-family:monospace;font-size:12px">${submission.id}</td></tr>
        </table>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:15px">
          ${escapeHtml(message).replace(/\n/g, "<br />")}
        </div>
      </div>
    `,
  });

  if (emailResult.sent) {
    await supabase
      .from("feedback_submissions")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", submission.id);
  } else {
    console.error("Feedback email failed:", emailResult.reason);
  }

  return NextResponse.json({ ok: true, emailSent: emailResult.sent });
}

import { SITE } from "@/lib/site";
import { sendEmail } from "@/lib/send-email";

export type ReactivationEmailResult =
  | { sent: true }
  | { sent: false; reason: string };

export async function sendAccountReactivationEmail(
  toEmail: string,
  recipientName?: string | null
): Promise<ReactivationEmailResult> {
  const name = recipientName?.trim() || "會員";
  const loginUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth`
    : "https://sporty-find.vercel.app/auth";

  const result = await sendEmail({
    to: toEmail,
    subject: `${SITE.name} — 您的帳戶已恢復使用`,
    html: `
      <div style="font-family:sans-serif;line-height:1.6;color:#0f172a;max-width:520px">
        <h2 style="color:#0f172a">您好，${name}</h2>
        <p>您的 ${SITE.name} 帳戶已由管理員重新啟用，現在可以再次登入使用平台功能。</p>
        <p><a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">立即登入</a></p>
        <p style="color:#64748b;font-size:14px">如有任何疑問，請聯絡：${SITE.supportEmail}</p>
      </div>
    `,
  });

  if (!result.sent) {
    return { sent: false, reason: result.reason };
  }

  return { sent: true };
}

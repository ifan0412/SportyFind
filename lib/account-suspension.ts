import { SITE } from "@/lib/site";

export type ReactivationEmailResult =
  | { sent: true }
  | { sent: false; reason: string };

export async function sendAccountReactivationEmail(
  toEmail: string,
  recipientName?: string | null
): Promise<ReactivationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? `${SITE.name} <noreply@sportyfind.app>`;

  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const name = recipientName?.trim() || "會員";
  const loginUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth`
    : "https://sporty-find.vercel.app/auth";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: `${SITE.name} — 您的帳戶已恢復使用`,
      html: `
        <div style="font-family:sans-serif;line-height:1.6;color:#0f172a;max-width:520px">
          <h2 style="color:#0f172a">您好，${name}</h2>
          <p>您的 ${SITE.name} 帳戶已由管理員重新啟用，現在可以再次登入使用平台功能。</p>
          <p><a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">立即登入</a></p>
          <p style="color:#64748b;font-size:14px">如有任何疑問，請聯絡：${SITE.supportEmail}</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { sent: false, reason: body || `Resend error ${res.status}` };
  }

  return { sent: true };
}

export function suspendedAccountMessage(reason?: string | null): string {
  const base = `您的帳戶已被暫停，暫時無法登入。如有疑問，請聯絡管理員：${SITE.supportEmail}`;
  if (reason?.trim()) {
    return `${base}\n\n原因：${reason.trim()}`;
  }
  return base;
}

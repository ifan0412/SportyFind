import { SITE } from "@/lib/site";

export function suspendedAccountMessage(reason?: string | null): string {
  const base = `您的帳戶已被暫停，暫時無法登入。如有疑問，請聯絡管理員：${SITE.supportEmail}`;
  if (reason?.trim()) {
    return `${base}\n\n原因：${reason.trim()}`;
  }
  return base;
}

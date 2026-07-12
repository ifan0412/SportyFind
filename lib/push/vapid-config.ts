import "server-only";

import { SITE } from "@/lib/site";

export function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

/** Apple rejects subjects like `mailto: user@x.com` (space after colon). */
export function normalizeVapidSubject(raw: string | undefined): string {
  const fallback = `mailto:${SITE.supportEmail}`;
  const subject = trimEnv(raw) || fallback;
  if (subject.toLowerCase().startsWith("mailto:")) {
    const email = subject.slice("mailto:".length).trim();
    return `mailto:${email}`;
  }
  return subject;
}

export function getVapidPublicKeyFromEnv(): string {
  return trimEnv(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

export function getVapidPrivateKeyFromEnv(): string {
  return trimEnv(process.env.VAPID_PRIVATE_KEY);
}

export function getVapidSubjectFromEnv(): string {
  return normalizeVapidSubject(process.env.VAPID_SUBJECT);
}

export function isLikelyApplePushEndpoint(endpoint: string): boolean {
  return endpoint.includes("web.push.apple.com");
}

export function formatPushDeliveryError(err: {
  statusCode?: number;
  body?: string;
  message?: string;
}): string {
  const body = String(err.body ?? "");
  const status = err.statusCode;

  if (body.includes("BadJwtToken") || status === 403) {
    return "VAPID 公鑰與私鑰不匹配。請在 Vercel 設定同一對金鑰，重新部署，再按「重新訂閱」。";
  }

  if (status === 410 || status === 404) {
    return "此裝置訂閱已失效，請按「重新訂閱」。";
  }

  if (status === 500) {
    if (body) return `Apple 推送服務錯誤：${body.slice(0, 160)}`;
    return "Apple 推送服務錯誤 (HTTP 500)。通常是 VAPID 金鑰不匹配，請重新產生一對金鑰並重新訂閱。";
  }

  return [err.message, status ? `HTTP ${status}` : "", body ? body.slice(0, 160) : ""]
    .filter(Boolean)
    .join(" — ");
}

export function shouldInvalidateSubscription(status?: number, body?: string): boolean {
  const text = String(body ?? "");
  if (status === 404 || status === 410) return true;
  if (status === 403) return true;
  if (status === 500 && (text.includes("BadJwtToken") || text.includes("Vapid"))) return true;
  return false;
}

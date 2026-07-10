import { createHmac, timingSafeEqual } from "crypto";

export const GATE_COOKIE_NAME = "site_access";
const GATE_SALT = "sportyfind-beta-gate-v1";

export function getSiteGatePassword(): string | undefined {
  const value = process.env.SITE_GATE_PASSWORD?.trim();
  return value || undefined;
}

export function isSiteGateEnabled(): boolean {
  return Boolean(getSiteGatePassword());
}

function gateSigningSecret(password: string): string {
  return process.env.SITE_GATE_SECRET?.trim() || password;
}

export function createGateCookieValue(password: string): string {
  return createHmac("sha256", gateSigningSecret(password)).update(GATE_SALT).digest("hex");
}

export function verifyGateCookie(cookieValue: string | undefined, password: string): boolean {
  if (!cookieValue) return false;

  const expected = createGateCookieValue(password);
  if (cookieValue.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expected));
  } catch {
    return false;
  }
}

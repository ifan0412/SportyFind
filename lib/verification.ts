import type { User } from "@supabase/supabase-js";

export type SocialPlatform = "instagram" | "facebook" | "threads";
export type SocialContext = "profile" | "physio";

export interface SocialConnection {
  id: string;
  platform: SocialPlatform;
  context: SocialContext;
  external_id: string;
  username: string | null;
  profile_url: string;
  display_name: string | null;
  connected_at: string;
}

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
};

export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  return Boolean(user.email_confirmed_at ?? user.confirmed_at);
}

export function isOAuthUser(user: User | null | undefined): boolean {
  if (!user?.identities?.length) return false;
  return user.identities.some((i) => i.provider === "google" || i.provider === "apple");
}

export function isPhoneVerified(
  profile: { phone_verified_at?: string | null } | null | undefined,
  user?: User | null
): boolean {
  if (profile?.phone_verified_at) return true;
  return Boolean(user?.phone_confirmed_at);
}

export function formatPhoneDisplay(e164: string | null | undefined): string | null {
  if (!e164) return null;
  if (e164.startsWith("+852") && e164.length === 12) {
    return `${e164.slice(0, 4)} ${e164.slice(4, 8)} ${e164.slice(8)}`;
  }
  return e164;
}

export function normalizeHkPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("852") && digits.length === 11) return `+${digits}`;
  if (digits.length === 8) return `+852${digits}`;
  if (input.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

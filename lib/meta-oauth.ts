import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { SocialContext, SocialPlatform } from "@/lib/verification";

const META_GRAPH = "https://graph.facebook.com/v21.0";

export interface MetaOAuthState {
  userId: string;
  platform: SocialPlatform;
  context: SocialContext;
  nonce: string;
}

export interface MetaProfileResult {
  externalId: string;
  username: string | null;
  profileUrl: string;
  displayName: string | null;
}

export function isMetaOAuthConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function isMetaOAuthPublicConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_APP_ID);
}

function stateSecret(): string {
  return process.env.META_APP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-state-secret";
}

export function signMetaOAuthState(payload: MetaOAuthState): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyMetaOAuthState(token: string): MetaOAuthState | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MetaOAuthState;
  } catch {
    return null;
  }
}

function scopesForPlatform(platform: SocialPlatform): string {
  switch (platform) {
    case "facebook":
      return "public_profile";
    case "threads":
      return "threads_basic";
    case "instagram":
      return "instagram_basic,instagram_manage_insights,pages_show_list";
    default:
      return "public_profile";
  }
}

export function buildMetaAuthorizeUrl(
  platform: SocialPlatform,
  context: SocialContext,
  userId: string,
  redirectUri: string
): string {
  const appId = process.env.META_APP_ID!;
  const state = signMetaOAuthState({
    userId,
    platform,
    context,
    nonce: randomUUID(),
  });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopesForPlatform(platform),
    response_type: "code",
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeMetaCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string }> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${META_GRAPH}/oauth/access_token?${params.toString()}`);
  const data = (await res.json()) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || "Meta token exchange failed");
  }
  return { accessToken: data.access_token };
}

async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const url = `${META_GRAPH}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || (data as { error?: { message?: string } }).error) {
    throw new Error((data as { error?: { message?: string } }).error?.message || "Meta Graph API error");
  }
  return data;
}

export async function fetchMetaProfile(
  platform: SocialPlatform,
  accessToken: string
): Promise<MetaProfileResult> {
  if (platform === "facebook") {
    const me = await graphGet<{ id: string; name?: string; link?: string }>(
      "/me?fields=id,name,link",
      accessToken
    );
    return {
      externalId: me.id,
      username: null,
      displayName: me.name ?? null,
      profileUrl: me.link || `https://www.facebook.com/${me.id}`,
    };
  }

  if (platform === "threads") {
    const me = await graphGet<{ id: string; username?: string; threads_profile_picture_url?: string }>(
      "/me?fields=id,username,threads_profile_picture_url",
      accessToken
    );
    const username = me.username ?? null;
    return {
      externalId: me.id,
      username,
      displayName: username,
      profileUrl: username ? `https://www.threads.net/@${username}` : `https://www.threads.net`,
    };
  }

  // Instagram — requires Business/Creator account linked to a Facebook Page
  const accounts = await graphGet<{
    data?: Array<{
      id: string;
      instagram_business_account?: { id: string; username?: string };
    }>;
  }>("/me/accounts?fields=instagram_business_account{id,username}", accessToken);

  for (const page of accounts.data ?? []) {
    const ig = page.instagram_business_account;
    if (ig?.username) {
      return {
        externalId: ig.id,
        username: ig.username,
        displayName: ig.username,
        profileUrl: `https://www.instagram.com/${ig.username}`,
      };
    }
  }

  throw new Error(
    "找不到已連結的 Instagram 專業帳戶。請先將 Instagram 轉為創作者/商業帳戶並連結 Facebook 專頁。"
  );
}

export function profileUrlForPlatform(platform: SocialPlatform, username: string): string {
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${username}`;
    case "facebook":
      return `https://www.facebook.com/${username}`;
    case "threads":
      return `https://www.threads.net/@${username}`;
  }
}

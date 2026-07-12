export type ShareEntityType =
  | "profile"
  | "team"
  | "event"
  | "coach_service"
  | "physio_service"
  | "content";

export interface SharePayload {
  type: ShareEntityType;
  id: string;
  url: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

export const SHARE_PREFIX = "__sf_share__:";

const INVITE_INTROS: Record<ShareEntityType, string> = {
  profile: "我想邀請你看看以下名片頁面",
  team: "我想邀請你看看以下隊伍的頁面",
  event: "我想邀請你看看以下賽事／活動的頁面",
  coach_service: "我想邀請你看看以下教練服務的頁面",
  physio_service: "我想邀請你看看以下復健服務的頁面",
  content: "我想邀請你看看以下運動貼士文章",
};

const ENTITY_LABELS: Record<ShareEntityType, string> = {
  profile: "名片",
  team: "隊伍",
  event: "賽事／活動",
  coach_service: "教練服務",
  physio_service: "復健服務",
  content: "運動貼士",
};

export function shareEntityLabel(type: ShareEntityType): string {
  return ENTITY_LABELS[type];
}

export function buildShareMessage(payload: SharePayload): string {
  return `${INVITE_INTROS[payload.type]}\n${SHARE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseShareMessage(
  content: string
): { intro: string; payload: SharePayload } | null {
  const idx = content.indexOf(SHARE_PREFIX);
  if (idx === -1) return null;

  const intro = content.slice(0, idx).trim();
  const raw = content.slice(idx + SHARE_PREFIX.length).trim();
  try {
    const payload = JSON.parse(raw) as SharePayload;
    if (!payload?.type || !payload.url || !payload.title) return null;
    return { intro, payload };
  } catch {
    return null;
  }
}

export function sharePreviewText(content: string | null, fromMe: boolean): string | null {
  if (!content) return null;
  const parsed = parseShareMessage(content);
  if (!parsed) return null;
  const prefix = fromMe ? "你: " : "";
  return `${prefix}分享了${shareEntityLabel(parsed.payload.type)}「${parsed.payload.title}」`;
}

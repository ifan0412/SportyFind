export const CONTENT_CATEGORIES = [
  { id: "players", label: "運動員", labelEn: "Players", href: "/network" },
  { id: "coaches", label: "教練", labelEn: "Coaches", href: "/coaches" },
  { id: "teams", label: "隊伍", labelEn: "Teams", href: "/team" },
  { id: "events", label: "賽事", labelEn: "Events", href: "/events" },
  { id: "physio", label: "物理治療", labelEn: "Physio", href: "/physio" },
  { id: "general", label: "平台指南", labelEn: "General", href: "/" },
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number]["id"];

import { SPORT_CATEGORIES } from "@/lib/sports-categories";

export const CONTENT_SPORTS = SPORT_CATEGORIES.map((s) => s.id);

export function getCategoryLabel(id: string): string {
  return CONTENT_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function getCategoryMeta(id: string) {
  return CONTENT_CATEGORIES.find((c) => c.id === id);
}

/** Normalize DB value — supports legacy single string during transition */
export function normalizeCategories(value: unknown): string[] {
  if (Array.isArray(value) && value.length > 0) {
    return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  if (typeof value === "string" && value) return [value];
  return ["general"];
}

export function normalizeSports(value: unknown): string[] {
  if (Array.isArray(value) && value.length > 0) {
    return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  if (typeof value === "string" && value) return [value];
  return [];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `post-${Date.now()}`;
}

/** Selectable coach qualifications / certifications (shown as tags on listing cards) */

export const COACH_QUALIFICATIONS = [
  "國家級教練牌照",
  "亞洲體協教練證",
  "體適能教練證 (AASFP / NASM)",
  "健身教練證 (CPT)",
  "游泳教練證",
  "田徑教練證",
  "籃球教練證",
  "足球教練證",
  "網球教練證",
  "羽毛球教練證",
  "乒乓球教練證",
  "排球教練證",
  "瑜伽導師證 (RYT)",
  "普拉提導師證",
  "拳擊 / 搏擊教練證",
  "運動科學學士",
  "體育教育學士",
  "運動科學碩士",
  "CPR / 急救證書",
  "運動營養證書",
] as const;

/** Selectable physio qualifications / certifications */

export const PHYSIO_QUALIFICATIONS = [
  "註冊物理治療師 (HK)",
  "Chartered Physiotherapist (UK)",
  "運動物理治療師",
  "肌骨物理治療師",
  "骨科物理治療專科",
  "神經物理治療專科",
  "兒科物理治療專科",
  "Dry Needling 證書",
  "脊椎手法治療證書",
  "運動按摩證書",
  "肌內效貼紮證書",
  "物理治療學士",
  "物理治療碩士",
  "博士（物理治療 / 復健）",
  "運動科學學士",
  "CPR / 急救證書",
] as const;

export type CoachQualification = (typeof COACH_QUALIFICATIONS)[number];
export type PhysioQualification = (typeof PHYSIO_QUALIFICATIONS)[number];

export function normalizeQualificationTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0))];
}

const COACH_QUALIFICATION_SET = new Set<string>(COACH_QUALIFICATIONS);
const PHYSIO_QUALIFICATION_SET = new Set<string>(PHYSIO_QUALIFICATIONS);

export function filterCoachQualificationTags(tags: unknown): string[] {
  return normalizeQualificationTags(tags).filter((t) => COACH_QUALIFICATION_SET.has(t));
}

export function filterPhysioQualificationTags(tags: unknown): string[] {
  return normalizeQualificationTags(tags).filter((t) => PHYSIO_QUALIFICATION_SET.has(t));
}

/** Coach service target learner levels */

export const COACH_SKILL_LEVELS = [
  { id: "beginner", labelZh: "初學" },
  { id: "intermediate", labelZh: "中級" },
  { id: "advanced", labelZh: "高階" },
] as const;

export type CoachSkillLevelId = (typeof COACH_SKILL_LEVELS)[number]["id"];

const COACH_SKILL_LEVEL_SET = new Set<string>(COACH_SKILL_LEVELS.map((l) => l.id));

export function getCoachSkillLevel(id: string | null | undefined) {
  if (!id) return null;
  return COACH_SKILL_LEVELS.find((l) => l.id === id) ?? null;
}

export function coachSkillLevelLabelZh(id: string | null | undefined): string | null {
  return getCoachSkillLevel(id)?.labelZh ?? null;
}

const COACH_SKILL_LEVEL_ORDER: CoachSkillLevelId[] = ["beginner", "intermediate", "advanced"];

export function filterCoachSkillLevelTags(levels: string[]): CoachSkillLevelId[] {
  const unique = [...new Set(levels.filter((l) => COACH_SKILL_LEVEL_SET.has(l)))] as CoachSkillLevelId[];
  return unique.sort(
    (a, b) => COACH_SKILL_LEVEL_ORDER.indexOf(a) - COACH_SKILL_LEVEL_ORDER.indexOf(b)
  );
}

export function normalizeCoachSkillLevels(levels: unknown): CoachSkillLevelId[] {
  if (!Array.isArray(levels)) return [];
  const filtered = levels.filter((l): l is string => typeof l === "string" && l.trim().length > 0);
  return filterCoachSkillLevelTags(filtered);
}

export function coachSkillLevelsMatchFilter(
  serviceLevels: unknown,
  selectedLevels: string[]
): boolean {
  if (!selectedLevels.length) return true;
  const normalized = normalizeCoachSkillLevels(serviceLevels);
  if (!normalized.length) return false;
  return selectedLevels.some((level) => normalized.includes(level as CoachSkillLevelId));
}

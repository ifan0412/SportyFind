export type ProfileGender = "male" | "female";
export type GenderRequirement = "male" | "female" | "both";

export const PROFILE_GENDER_OPTIONS: { value: ProfileGender; label: string }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
];

export const GENDER_REQUIREMENT_OPTIONS: { value: GenderRequirement; label: string }[] = [
  { value: "both", label: "男女皆可" },
  { value: "male", label: "僅限男性" },
  { value: "female", label: "僅限女性" },
];

export const PROFILE_GENDER_LABELS: Record<ProfileGender, string> = {
  male: "男性",
  female: "女性",
};

export const GENDER_REQUIREMENT_LABELS: Record<GenderRequirement, string> = {
  both: "男女皆可",
  male: "僅限男性",
  female: "僅限女性",
};

export function normalizeProfileGender(value: string | null | undefined): ProfileGender | null {
  if (value === "male" || value === "female") return value;
  return null;
}

export function normalizeGenderRequirement(value: string | null | undefined): GenderRequirement {
  if (value === "male" || value === "female") return value;
  return "both";
}

export function genderMeetsRequirement(
  userGender: string | null | undefined,
  requirement: string | null | undefined
): boolean {
  const req = normalizeGenderRequirement(requirement);
  if (req === "both") return true;
  const gender = normalizeProfileGender(userGender);
  if (!gender) return false;
  return gender === req;
}

export function genderRequirementRejectMessage(requirement: string | null | undefined): string {
  const req = normalizeGenderRequirement(requirement);
  if (req === "male") return "不符合性別要求：此活動僅限男性參加。請於個人檔案設定性別後再試。";
  if (req === "female") return "不符合性別要求：此活動僅限女性參加。請於個人檔案設定性別後再試。";
  return "不符合性別報名要求。請於個人檔案設定性別後再試。";
}

export function teamGenderRequirementRejectMessage(requirement: string | null | undefined): string {
  const req = normalizeGenderRequirement(requirement);
  if (req === "male") return "不符合性別要求：此隊伍僅限男性加入。請於個人檔案設定性別後再試。";
  if (req === "female") return "不符合性別要求：此隊伍僅限女性加入。請於個人檔案設定性別後再試。";
  return "不符合此隊伍的性別報名要求。請於個人檔案設定性別後再試。";
}

/** True when the new rule is stricter than the previous (incl. male ↔ female switch). */
export function isGenderRequirementTightened(
  previous: string | null | undefined,
  next: string | null | undefined
): boolean {
  const prev = normalizeGenderRequirement(previous);
  const nextReq = normalizeGenderRequirement(next);
  if (prev === nextReq) return false;
  if (nextReq === "both") return false;
  if (prev === "both") return true;
  return prev !== nextReq;
}

export interface IncompatibleTeamMember {
  userId: string;
  fullName: string;
  role: string;
  gender: string | null;
  reason: "gender_mismatch" | "gender_unset";
}

type TeamMemberGenderRow = {
  user_id: string;
  role: string;
  profiles?: { full_name?: string | null; gender?: string | null } | null;
};

export function getIncompatibleTeamMembersForRequirement(
  members: TeamMemberGenderRow[],
  requirement: GenderRequirement
): IncompatibleTeamMember[] {
  const req = normalizeGenderRequirement(requirement);
  if (req === "both") return [];

  return members
    .filter((m) => !genderMeetsRequirement(m.profiles?.gender, req))
    .map((m) => ({
      userId: m.user_id,
      fullName: m.profiles?.full_name?.trim() || "未命名成員",
      role: m.role,
      gender: m.profiles?.gender ?? null,
      reason: m.profiles?.gender ? "gender_mismatch" : "gender_unset",
    }));
}

export function formatIncompatibleTeamMembersMessage(
  members: IncompatibleTeamMember[],
  requirement: GenderRequirement
): string {
  const reqLabel = GENDER_REQUIREMENT_LABELS[normalizeGenderRequirement(requirement)];
  const lines = members.map((m) => {
    const roleNote =
      m.role === "pending"
        ? "（待審申請）"
        : m.role === "coach"
          ? "（教練）"
          : m.role === "admin"
            ? "（管理員）"
            : "";
    const reasonNote =
      m.reason === "gender_unset" ? "，尚未設定性別" : `，性別為${PROFILE_GENDER_LABELS[m.gender as ProfileGender] ?? "未知"}`;
    return `• ${m.fullName}${roleNote}${reasonNote}`;
  });
  return `無法儲存：以下成員不符合「${reqLabel}」要求，請先至「成員」分頁移除後再試：\n\n${lines.join("\n")}`;
}

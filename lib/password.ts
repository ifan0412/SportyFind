export type PasswordRuleId = "length" | "letter" | "number" | "special";

export interface PasswordRule {
  id: PasswordRuleId;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "至少 8 個字元", test: (p) => p.length >= 8 },
  { id: "letter", label: "須包含英文字母與數字", test: (p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p) },
  { id: "special", label: "須包含至少一個特殊符號", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

export function getPasswordRuleStatus(password: string): Record<PasswordRuleId, boolean> {
  return PASSWORD_RULES.reduce((acc, rule) => {
    acc[rule.id] = rule.test(password);
    return acc;
  }, {} as Record<PasswordRuleId, boolean>);
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function getPasswordValidationError(password: string): string | null {
  if (!password) return "請輸入密碼。";
  if (!isPasswordValid(password)) return "密碼未符合所有要求。";
  return null;
}

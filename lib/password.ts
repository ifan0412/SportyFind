export type PasswordRuleId = "length" | "letter" | "number" | "special";

export interface PasswordRule {
  id: PasswordRuleId;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "letter", label: "Contains letters and numbers", test: (p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p) },
  { id: "special", label: "Contains at least one special character", test: (p) => /[^a-zA-Z0-9]/.test(p) },
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
  if (!password) return "Please enter a password.";
  if (!isPasswordValid(password)) return "Password does not meet all requirements.";
  return null;
}

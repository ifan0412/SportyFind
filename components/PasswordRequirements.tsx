"use client";

import { PASSWORD_RULES, getPasswordRuleStatus } from "@/lib/password";

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

export function PasswordRequirements({ password, className = "" }: PasswordRequirementsProps) {
  const status = getPasswordRuleStatus(password);

  return (
    <ul className={`space-y-1.5 ${className}`}>
      {PASSWORD_RULES.map((rule) => {
        const met = status[rule.id];
        return (
          <li
            key={rule.id}
            className={`flex items-start gap-2 text-[11px] leading-snug ${
              met ? "text-emerald-400" : password ? "text-red-400" : "text-slate-500"
            }`}
          >
            <span className="mt-0.5 shrink-0">{met ? "✓" : password ? "✕" : "○"}</span>
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

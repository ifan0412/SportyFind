import { ShieldCheck } from "lucide-react";

const SIZE_CLASSES = {
  xs: "w-[18px] h-[18px]",
  sm: "w-5 h-5",
  md: "w-6 h-6",
} as const;

const ICON_SIZES: Record<keyof typeof SIZE_CLASSES, number> = {
  xs: 10,
  sm: 11,
  md: 13,
};

export type PhoneVerifiedBadgeSize = keyof typeof SIZE_CLASSES;

interface PhoneVerifiedBadgeProps {
  size?: PhoneVerifiedBadgeSize;
  className?: string;
}

export function PhoneVerifiedBadge({ size = "sm", className = "" }: PhoneVerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border shrink-0 bg-emerald-500/25 border-emerald-400/50 text-emerald-200 ${SIZE_CLASSES[size]} ${className}`}
      title="已驗證手機"
      aria-label="已驗證手機"
    >
      <ShieldCheck size={ICON_SIZES[size]} strokeWidth={2.5} aria-hidden />
    </span>
  );
}

interface PhoneVerifiedAvatarBadgeProps {
  verifiedAt?: string | null;
  size?: PhoneVerifiedBadgeSize;
  /** Use top-left when gender badge occupies upper-right */
  corner?: "top-left" | "top-right";
  className?: string;
}

/**
 * Pin phone-verified badge on avatar rim.
 * Parent must be `relative` with explicit avatar dimensions and `overflow-visible`.
 */
export function PhoneVerifiedAvatarBadge({
  verifiedAt,
  size = "xs",
  corner = "top-left",
  className = "",
}: PhoneVerifiedAvatarBadgeProps) {
  if (!verifiedAt) return null;

  const cornerClass =
    corner === "top-right"
      ? "absolute top-0 right-0 z-10 translate-x-1/4 -translate-y-1/4"
      : "absolute top-0 left-0 z-10 -translate-x-1/4 -translate-y-1/4";

  return (
    <span className={`${cornerClass} pointer-events-none ${className}`}>
      <PhoneVerifiedBadge size={size} className="shadow-md ring-2 ring-slate-950" />
    </span>
  );
}

export function isPhoneVerified(verifiedAt?: string | null): boolean {
  return Boolean(verifiedAt);
}

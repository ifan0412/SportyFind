import { normalizeProfileGender, PROFILE_GENDER_LABELS, type ProfileGender } from "@/lib/gender";

const BADGE_STYLES: Record<ProfileGender, string> = {
  male: "bg-blue-500/25 border-blue-400/50 text-blue-200",
  female: "bg-pink-500/25 border-pink-400/50 text-pink-200",
};

const SYMBOLS: Record<ProfileGender, string> = {
  male: "♂",
  female: "♀",
};

/** Fine-tune unicode gender symbols so they sit visually centered in the circle. */
const SYMBOL_NUDGE: Record<ProfileGender, string> = {
  male: "translate-y-[0.5px]",
  female: "-translate-y-[0.5px]",
};

const SIZE_CLASSES = {
  xs: "w-[18px] h-[18px] text-[9px]",
  sm: "w-5 h-5 text-[10px]",
  md: "w-6 h-6 text-xs",
} as const;

export type GenderBadgeSize = keyof typeof SIZE_CLASSES;

interface GenderBadgeProps {
  gender: string | null | undefined;
  size?: GenderBadgeSize;
  className?: string;
}

export function GenderBadge({ gender, size = "sm", className = "" }: GenderBadgeProps) {
  const normalized = normalizeProfileGender(gender);
  if (!normalized) return null;

  return (
    <span
      className={`inline-grid place-items-center rounded-full border font-black leading-none shrink-0 box-border p-0 ${BADGE_STYLES[normalized]} ${SIZE_CLASSES[size]} ${className}`}
      title={PROFILE_GENDER_LABELS[normalized]}
      aria-label={PROFILE_GENDER_LABELS[normalized]}
    >
      <span
        className={`block leading-none select-none ${SYMBOL_NUDGE[normalized]}`}
        aria-hidden
      >
        {SYMBOLS[normalized]}
      </span>
    </span>
  );
}

/**
 * Pin gender badge on avatar upper-right rim.
 * Parent must be `relative` with explicit avatar dimensions and `overflow-visible`.
 */
export function GenderAvatarBadge({
  gender,
  size = "xs",
  className = "",
}: GenderBadgeProps) {
  const normalized = normalizeProfileGender(gender);
  if (!normalized) return null;

  return (
    <GenderBadge
      gender={normalized}
      size={size}
      className={`absolute top-0 right-0 z-10 translate-x-1/4 -translate-y-1/4 shadow-md ring-2 ring-slate-950 pointer-events-none ${className}`}
    />
  );
}

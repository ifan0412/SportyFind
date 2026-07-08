import { Mars, Venus } from "lucide-react";
import { normalizeProfileGender, PROFILE_GENDER_LABELS, type ProfileGender } from "@/lib/gender";

const BADGE_STYLES: Record<ProfileGender, string> = {
  male: "bg-blue-500/25 border-blue-400/50 text-blue-200",
  female: "bg-pink-500/25 border-pink-400/50 text-pink-200",
};

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

export type GenderBadgeSize = keyof typeof SIZE_CLASSES;

interface GenderBadgeProps {
  gender: string | null | undefined;
  size?: GenderBadgeSize;
  className?: string;
}

function GenderIcon({ gender, size }: { gender: ProfileGender; size: GenderBadgeSize }) {
  const iconSize = ICON_SIZES[size];
  const props = { size: iconSize, strokeWidth: 2.5, "aria-hidden": true as const };
  return gender === "male" ? <Mars {...props} /> : <Venus {...props} />;
}

export function GenderBadge({ gender, size = "sm", className = "" }: GenderBadgeProps) {
  const normalized = normalizeProfileGender(gender);
  if (!normalized) return null;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border shrink-0 ${BADGE_STYLES[normalized]} ${SIZE_CLASSES[size]} ${className}`}
      title={PROFILE_GENDER_LABELS[normalized]}
      aria-label={PROFILE_GENDER_LABELS[normalized]}
    >
      <GenderIcon gender={normalized} size={size} />
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
    <span
      className={`absolute top-0 right-0 z-10 translate-x-1/4 -translate-y-1/4 pointer-events-none ${className}`}
    >
      <GenderBadge
        gender={normalized}
        size={size}
        className="shadow-md ring-2 ring-slate-950"
      />
    </span>
  );
}

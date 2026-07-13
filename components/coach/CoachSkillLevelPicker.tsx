"use client";

import {
  COACH_SKILL_LEVELS,
  filterCoachSkillLevelTags,
  type CoachSkillLevelId,
} from "@/lib/coach-skill-levels";

const chipBase =
  "px-3 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer";

export function CoachSkillLevelPicker({
  value,
  onChange,
  minSelected = 0,
}: {
  value: CoachSkillLevelId[];
  onChange: (levels: CoachSkillLevelId[]) => void;
  minSelected?: number;
}) {
  const toggle = (id: CoachSkillLevelId) => {
    if (value.includes(id)) {
      if (minSelected > 0 && value.length <= minSelected) return;
      onChange(value.filter((l) => l !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {COACH_SKILL_LEVELS.map((level) => {
        const selected = value.includes(level.id);
        return (
          <button
            key={level.id}
            type="button"
            onClick={() => toggle(level.id)}
            className={`${chipBase} ${
              selected
                ? "bg-violet-600/20 border-violet-500 text-violet-300"
                : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
            }`}
          >
            {level.labelZh}
          </button>
        );
      })}
      {value.length > 0 && (
        <p className="w-full text-[11px] text-zinc-600 mt-1">已選 {value.length} 個程度</p>
      )}
    </div>
  );
}

const badgeSizes = {
  xs: "text-[10px] px-2 py-0.5",
  sm: "text-xs px-3 py-1",
  md: "text-sm px-3.5 py-1.5",
  lg: "text-base px-4 py-2",
};

export function CoachSkillLevelBadge({
  level,
  size = "sm",
}: {
  level: string | null | undefined;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const meta = COACH_SKILL_LEVELS.find((l) => l.id === level);
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full font-black border tracking-wider bg-violet-500/15 text-violet-400 border-violet-500/30 whitespace-nowrap ${badgeSizes[size]}`}
    >
      {meta.labelZh}
    </span>
  );
}

export function CoachSkillLevelBadges({
  levels,
  size = "sm",
  max = 3,
}: {
  levels: string[];
  size?: "xs" | "sm" | "md" | "lg";
  max?: number;
}) {
  const unique = filterCoachSkillLevelTags([...new Set(levels.filter(Boolean))]);
  if (!unique.length) return null;
  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((level) => (
        <CoachSkillLevelBadge key={level} level={level} size={size} />
      ))}
      {extra > 0 && (
        <span className={`text-zinc-500 font-bold ${size === "xs" ? "text-[10px]" : "text-xs"}`}>
          +{extra}
        </span>
      )}
    </div>
  );
}

import { formatProfileAgeForStats } from "@/lib/profile-age";
import { cn } from "@/lib/utils";

interface ProfilePhysicalStatsRowProps {
  age?: number | null;
  showAge?: boolean | null;
  heightCm?: number | null;
  weightKg?: number | null;
  showPhysicalStats?: boolean | null;
  className?: string;
  size?: "sm" | "md";
}

export function ProfilePhysicalStatsRow({
  age,
  showAge,
  heightCm,
  weightKg,
  showPhysicalStats,
  className,
  size = "sm",
}: ProfilePhysicalStatsRowProps) {
  const segments: string[] = [];
  const ageLabel = showAge ? formatProfileAgeForStats(age) : null;
  if (ageLabel) segments.push(ageLabel);
  if (showPhysicalStats && heightCm) segments.push(`H: ${heightCm} cm`);
  if (showPhysicalStats && weightKg) segments.push(`W: ${weightKg} kg`);

  if (segments.length === 0) return null;

  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-nowrap items-center justify-center gap-1.5 overflow-hidden rounded-full border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-zinc-400 shadow-inner whitespace-nowrap",
        size === "sm" ? "text-[10px]" : "text-xs",
        className
      )}
    >
      {segments.map((segment, index) => (
        <span
          key={segment}
          className={cn(
            "shrink-0 tabular-nums leading-none",
            index > 0 && "border-l border-slate-700 pl-1.5"
          )}
        >
          {segment}
        </span>
      ))}
    </div>
  );
}

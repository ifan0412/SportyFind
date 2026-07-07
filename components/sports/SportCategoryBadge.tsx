import { getSportCategory } from "@/lib/sports-categories";

type BadgeVariant = "amber" | "emerald" | "blue" | "slate";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  slate: "bg-slate-800/80 text-zinc-300 border-slate-700",
};

export function SportCategoryBadge({
  category,
  variant = "amber",
  size = "sm",
}: {
  category: string | null | undefined;
  variant?: BadgeVariant;
  size?: "sm" | "xs" | "md" | "lg";
}) {
  const sport = getSportCategory(category);
  if (!sport) return null;

  const sizeClass =
    size === "xs"
      ? "text-[10px] px-2 py-0.5"
      : size === "lg"
        ? "text-base px-4 py-2 gap-2"
      : size === "md"
        ? "text-sm px-3.5 py-1.5 gap-1.5"
        : "text-xs px-3 py-1";

  const emojiClass =
    size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-black uppercase border tracking-wider ${sizeClass} ${VARIANT_CLASS[variant]}`}
    >
      <span className={emojiClass}>{sport.emoji}</span>
      <span>{sport.labelZh}</span>
    </span>
  );
}

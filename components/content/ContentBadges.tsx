import { getCategoryLabel } from "@/lib/content/constants";

export function ContentBadges({
  categories,
  sports,
  size = "sm",
  overlay = false,
}: {
  categories: string[];
  sports: string[];
  size?: "sm" | "xs";
  overlay?: boolean;
}) {
  const pad = size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[10px]";
  const catCls = overlay
    ? "bg-slate-950/60 text-blue-300 border-blue-500/30 backdrop-blur-sm"
    : "bg-blue-500/10 text-blue-400 border-blue-500/20";
  const sportCls = overlay
    ? "bg-slate-950/60 text-amber-300 border-amber-500/30 backdrop-blur-sm"
    : "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <>
      {categories.map((c) => (
        <span
          key={`cat-${c}`}
          className={`font-black uppercase rounded-full border ${catCls} ${pad}`}
        >
          {getCategoryLabel(c)}
        </span>
      ))}
      {sports.map((s) => (
        <span
          key={`sport-${s}`}
          className={`font-black rounded-full border ${sportCls} ${pad}`}
        >
          {s}
        </span>
      ))}
    </>
  );
}

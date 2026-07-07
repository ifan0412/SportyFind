const badgeSizes = {
  xs: "text-[10px] px-2 py-0.5",
  sm: "text-xs px-2.5 py-1",
};

const accentStyles = {
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  emerald: "bg-violet-500/10 text-violet-300 border-violet-500/25",
  blue: "bg-blue-500/10 text-blue-300 border-blue-500/25",
};

export function QualificationBadges({
  tags,
  accent = "amber",
  size = "sm",
  max = 4,
  align = "center",
}: {
  tags: string[];
  accent?: "amber" | "emerald" | "blue";
  size?: "xs" | "sm";
  max?: number;
  align?: "left" | "center";
}) {
  const unique = [...new Set(tags.filter(Boolean))];
  if (!unique.length) return null;

  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;
  const style = accentStyles[accent];

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${align === "left" ? "justify-start" : "justify-center"}`}>
      {shown.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center rounded-full font-black border tracking-wide ${style} ${badgeSizes[size]}`}
        >
          {tag}
        </span>
      ))}
      {extra > 0 && (
        <span className={`text-zinc-500 font-bold ${size === "xs" ? "text-[10px]" : "text-xs"}`}>
          +{extra}
        </span>
      )}
    </div>
  );
}

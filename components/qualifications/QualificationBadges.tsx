const badgeSizes = {
  xs: "text-[10px] px-2 py-0.5",
  sm: "text-xs px-2.5 py-1",
};

const accentStyles = {
  orange: "bg-orange-500/10 text-orange-300 border-orange-500/25",
  green: "bg-green-500/10 text-green-300 border-green-500/25",
  blue: "bg-blue-500/10 text-blue-300 border-blue-500/25",
  /** @deprecated use orange */
  amber: "bg-orange-500/10 text-orange-300 border-orange-500/25",
  /** @deprecated use green */
  emerald: "bg-green-500/10 text-green-300 border-green-500/25",
};

export function QualificationBadges({
  tags,
  accent = "orange",
  size = "sm",
  max = 4,
  align = "left",
}: {
  tags: string[];
  accent?: "orange" | "green" | "blue" | "amber" | "emerald";
  size?: "xs" | "sm";
  max?: number;
  align?: "left" | "center";
}) {
  const unique = [...new Set(tags.filter(Boolean))];
  if (!unique.length) return null;

  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;
  const resolvedAccent = accent === "amber" ? "orange" : accent === "emerald" ? "green" : accent;
  const style = accentStyles[resolvedAccent];

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

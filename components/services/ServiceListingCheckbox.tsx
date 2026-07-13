"use client";

import { cn } from "@/lib/utils";
import { MAX_LISTING_SERVICES } from "@/lib/service-listing-selection";

type Accent = "orange" | "green";

const accentStyles: Record<
  Accent,
  { checked: string; label: string; disabled: string }
> = {
  orange: {
    checked: "border-orange-500/60 bg-orange-500/10 text-orange-300",
    label: "text-orange-400",
    disabled: "border-slate-800 bg-slate-950/40 text-zinc-600",
  },
  green: {
    checked: "border-green-500/60 bg-green-500/10 text-green-300",
    label: "text-green-400",
    disabled: "border-slate-800 bg-slate-950/40 text-zinc-600",
  },
};

interface ServiceListingCheckboxProps {
  checked: boolean;
  disabled?: boolean;
  accent?: Accent;
  onToggle: () => void;
  className?: string;
}

export function ServiceListingCheckbox({
  checked,
  disabled = false,
  accent = "orange",
  onToggle,
  className,
}: ServiceListingCheckboxProps) {
  const styles = accentStyles[accent];

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[10px] font-black transition select-none",
        checked ? styles.checked : disabled ? styles.disabled : "border-slate-700 bg-slate-950/70 text-zinc-400 hover:border-slate-500",
        disabled && !checked ? "cursor-not-allowed" : "cursor-pointer",
        className
      )}
      title={
        disabled && !checked
          ? `名錄最多只能選 ${MAX_LISTING_SERVICES} 項，請先取消其他項目`
          : checked
            ? "取消在名錄大廳顯示"
            : "顯示於名錄大廳"
      }
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className="size-3.5 rounded border-slate-600 accent-current cursor-pointer disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled && !checked}
        onChange={(e) => {
          e.stopPropagation();
          if (disabled && !checked) return;
          onToggle();
        }}
        onClick={(e) => e.stopPropagation()}
      />
      <span className={cn(checked && styles.label)}>名錄展示</span>
    </label>
  );
}

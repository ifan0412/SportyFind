"use client";

import { SPORT_CATEGORIES, type SportCategoryId } from "@/lib/sports-categories";

interface SportCategoryPickerProps {
  value: string;
  onChange: (id: SportCategoryId) => void;
  accent?: "orange" | "green" | "blue" | "amber" | "emerald";
}

const ACCENT_SELECTED: Record<string, string> = {
  orange: "bg-orange-600/15 border-orange-500 text-orange-300 shadow-[0_0_12px_rgba(234,88,12,0.15)]",
  green: "bg-green-600/15 border-green-500 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.15)]",
  blue: "bg-blue-600/15 border-blue-500 text-blue-300 shadow-[0_0_12px_rgba(37,99,235,0.15)]",
  amber: "bg-orange-600/15 border-orange-500 text-orange-300 shadow-[0_0_12px_rgba(234,88,12,0.15)]",
  emerald: "bg-green-600/15 border-green-500 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.15)]",
};

export function SportCategoryPicker({
  value,
  onChange,
  accent = "orange",
}: SportCategoryPickerProps) {
  const resolvedAccent = accent === "amber" ? "orange" : accent === "emerald" ? "green" : accent;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {SPORT_CATEGORIES.map((sport) => {
        const selected = value === sport.id;
        return (
          <button
            key={sport.id}
            type="button"
            onClick={() => onChange(sport.id)}
            className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border text-center transition-all min-h-[88px] ${
              selected
                ? ACCENT_SELECTED[resolvedAccent]
                : "bg-slate-950/60 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-zinc-200"
            }`}
          >
            <span className="text-2xl leading-none">{sport.emoji}</span>
            <span className="text-sm font-black text-white leading-tight">{sport.labelZh}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { SPORT_CATEGORIES, type SportCategoryId } from "@/lib/sports-categories";

interface SportCategoryPickerProps {
  value: string;
  onChange: (id: SportCategoryId) => void;
  accent?: "amber" | "emerald" | "blue";
}

const ACCENT_SELECTED: Record<NonNullable<SportCategoryPickerProps["accent"]>, string> = {
  amber: "bg-amber-600/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(217,119,6,0.15)]",
  emerald: "bg-emerald-600/15 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
  blue: "bg-blue-600/15 border-blue-500 text-blue-300 shadow-[0_0_12px_rgba(37,99,235,0.15)]",
};

export function SportCategoryPicker({
  value,
  onChange,
  accent = "amber",
}: SportCategoryPickerProps) {
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
                ? ACCENT_SELECTED[accent]
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

"use client";

import { useEffect, useState } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import type {
  MobileFilterAccent,
  MobileFilterCategory,
  MobileFilterValues,
} from "./types";
import { categorySelectionCount } from "./filter-helpers";

interface MobileFilterSheetProps {
  isOpen: boolean;
  categories: MobileFilterCategory[];
  values: MobileFilterValues;
  onChange: (next: MobileFilterValues) => void;
  onCancel: () => void;
  onApply: () => void;
  accent?: MobileFilterAccent;
  title?: string;
}

const accentStyles: Record<
  MobileFilterAccent,
  { active: string; chipOn: string; apply: string }
> = {
  blue: {
    active: "bg-blue-600/15 text-blue-300 border-blue-500/40",
    chipOn: "bg-blue-600/15 border-blue-500 text-blue-300",
    apply: "bg-blue-600 hover:bg-blue-500",
  },
  orange: {
    active: "bg-orange-600/15 text-orange-300 border-orange-500/40",
    chipOn: "bg-orange-600/15 border-orange-500 text-orange-300",
    apply: "bg-orange-600 hover:bg-orange-500",
  },
  green: {
    active: "bg-green-600/15 text-green-300 border-green-500/40",
    chipOn: "bg-green-600/15 border-green-500 text-green-300",
    apply: "bg-green-600 hover:bg-green-500",
  },
  yellow: {
    active: "bg-yellow-600/15 text-yellow-300 border-yellow-500/40",
    chipOn: "bg-yellow-600/15 border-yellow-500 text-yellow-300",
    apply: "bg-yellow-600 hover:bg-yellow-500",
  },
  amber: {
    active: "bg-amber-600/15 text-amber-300 border-amber-500/40",
    chipOn: "bg-amber-600/15 border-amber-500 text-amber-300",
    apply: "bg-amber-600 hover:bg-amber-500",
  },
  purple: {
    active: "bg-purple-600/15 text-purple-300 border-purple-500/40",
    chipOn: "bg-purple-600/15 border-purple-500 text-purple-300",
    apply: "bg-purple-600 hover:bg-purple-500",
  },
};

function toggleMulti(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
}

export function MobileFilterSheet({
  isOpen,
  categories,
  values,
  onChange,
  onCancel,
  onApply,
  accent = "blue",
  title = "篩選條件",
}: MobileFilterSheetProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");
  const styles = accentStyles[accent];

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen && categories.length > 0) {
      setActiveCategoryId((prev) =>
        categories.some((c) => c.id === prev) ? prev : categories[0].id
      );
    }
  }, [isOpen, categories]);

  if (!isOpen || categories.length === 0) return null;

  const activeCategory =
    categories.find((c) => c.id === activeCategoryId) ?? categories[0];

  const setCategoryValue = (categoryId: string, next: string | string[]) => {
    onChange({ ...values, [categoryId]: next });
  };

  const renderOption = (
    category: MobileFilterCategory,
    option: { id: string; label: string }
  ) => {
    const raw = values[category.id];
    const isSelected =
      category.type === "single"
        ? raw === option.id
        : Array.isArray(raw) && raw.includes(option.id);

    const handleClick = () => {
      if (category.type === "single") {
        setCategoryValue(category.id, option.id);
        return;
      }
      const current = Array.isArray(raw) ? raw : [];
      setCategoryValue(category.id, toggleMulti(current, option.id));
    };

    return (
      <button
        key={option.id}
        type="button"
        onClick={handleClick}
        className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-bold transition ${
          isSelected
            ? styles.chipOn
            : "bg-slate-950/60 border-slate-800 text-zinc-300 hover:border-slate-600"
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span>{option.label}</span>
          {isSelected && <span className="text-xs shrink-0">✓</span>}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-slate-950 md:hidden">
      <div className="shrink-0 px-4 py-3.5 border-b border-slate-800 flex items-center justify-between safe-area-top">
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>

      <div className="flex flex-1 min-h-0">
        <nav className="w-[30%] max-w-[120px] shrink-0 border-r border-slate-800 overflow-y-auto bg-slate-900/40">
          {categories.map((cat) => {
            const count = categorySelectionCount(cat, values);
            const isActive = cat.id === activeCategory.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className={`w-full text-left px-3 py-3.5 text-xs font-bold border-l-2 transition ${
                  isActive
                    ? `border-l-blue-500 ${styles.active}`
                    : "border-l-transparent text-zinc-400 hover:text-zinc-200 hover:bg-slate-900/60"
                }`}
              >
                <span className="block leading-snug">{cat.label}</span>
                {count > 0 && (
                  <span className="mt-1 inline-block text-[10px] font-black text-blue-400">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto p-3">
          <p className="text-xs font-bold text-zinc-500 mb-3 px-1">
            {activeCategory.label}
            {activeCategory.type === "multi" ? " · 可多選" : " · 單選"}
          </p>

          {activeCategory.groups?.length ? (
            <div className="space-y-4">
              {activeCategory.groups.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-wider px-1">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map((opt) => renderOption(activeCategory, opt))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(activeCategory.options ?? []).map((opt) =>
                renderOption(activeCategory, opt)
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-800 p-4 flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-slate-950">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl text-sm font-bold text-zinc-300 bg-slate-800 hover:bg-slate-700 transition"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onApply}
          className={`flex-1 py-3.5 rounded-xl text-sm font-black text-white transition ${styles.apply}`}
        >
          套用全部
        </button>
      </div>
    </div>
  );
}

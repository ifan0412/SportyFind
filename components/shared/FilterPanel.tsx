"use client";

import { useEffect, useRef, useState } from "react";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterMultiSelectField {
  type: "multi-select";
  id: string;
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  colSpanClass?: string;
}

export interface FilterSingleSelectField {
  type: "select";
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  colSpanClass?: string;
  accent?: "blue" | "emerald";
}

export type FilterField = FilterMultiSelectField | FilterSingleSelectField;

export interface FilterPanelProps {
  fields: FilterField[];
  onReset: () => void;
  hasActiveFilters: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  mobileTitle?: string;
  mobileApplyLabel?: (resultCount: number) => string;
  resultCount?: number;
  resetColSpanClass?: string;
}

function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "所有項目 (All)",
}: Omit<FilterMultiSelectField, "type" | "id" | "colSpanClass">) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleOption = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  // Fix: show label not value
  const selectedLabels = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label);

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selectedLabels[0]
        : `已篩選 ${selected.length} 個項目`;

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="mb-1.5 block pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-[46px] w-full cursor-pointer items-center justify-between rounded-xl border border-pro-slate-700/80 bg-pro-slate-950 px-4 py-3 text-left text-xs font-black text-blue-400 transition hover:border-pro-blue-500 sm:text-sm"
      >
        <span className="truncate pr-2">{displayText}</span>
        <span className="pointer-events-none text-[10px] text-slate-500">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-[72px] left-0 right-0 z-50 flex max-h-60 flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-pro-slate-700 bg-pro-slate-800 py-1 shadow-2xl">
          <button
            type="button"
            onClick={() => { onChange([]); setIsOpen(false); }}
            className={`flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-bold transition hover:bg-pro-slate-700 ${
              selected.length === 0
                ? "bg-pro-slate-900/50 text-blue-400"
                : "text-slate-300"
            }`}
          >
            <span>顯示所有項目 (取消篩選)</span>
            {selected.length === 0 && <span className="text-blue-500">✓</span>}
          </button>

          <div className="mx-2 my-1 h-px bg-pro-slate-700/80" />

          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                className={`flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-bold transition hover:bg-pro-slate-700 ${
                  isSelected ? "bg-pro-slate-900/30 text-blue-400" : "text-slate-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition ${
                      isSelected
                        ? "border-pro-blue-600 bg-pro-blue-600"
                        : "border-pro-slate-600 bg-pro-slate-900"
                    }`}
                  >
                    {isSelected && <span className="text-[9px] text-white">✓</span>}
                  </span>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSingleSelect({
  label,
  options,
  value,
  onChange,
  accent = "emerald",
}: Omit<FilterSingleSelectField, "type" | "id" | "colSpanClass">) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-400 focus:border-emerald-500"
      : "text-blue-400 focus:border-pro-blue-500";

  return (
    <div className="relative w-full">
      <label className="mb-1.5 block pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-[46px] w-full cursor-pointer appearance-none rounded-xl border border-pro-slate-700/80 bg-pro-slate-950 px-4 py-3 text-xs font-black transition focus:outline-none sm:text-sm ${accentClass}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterControls({
  fields,
  onReset,
  hasActiveFilters,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  resetColSpanClass = "lg:col-span-2",
}: Omit<FilterPanelProps, "mobileTitle" | "mobileApplyLabel" | "resultCount">) {
  return (
    <div className="space-y-4">
      {onSearchChange && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? "搜尋姓名、技術關鍵字或地區..."}
            className="w-full rounded-2xl border border-pro-slate-700/80 bg-pro-slate-950 py-3.5 pr-4 pl-11 text-xs font-bold text-white placeholder:text-slate-500 transition focus:border-pro-blue-500 focus:outline-none sm:text-sm"
          />
          <span className="absolute top-4 left-4 text-sm text-slate-500">🔍</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-12">
        {fields.map((field) => (
          <div key={field.id} className={field.colSpanClass ?? "lg:col-span-5"}>
            {field.type === "multi-select" ? (
              <FilterMultiSelect
                label={field.label}
                options={field.options}
                selected={field.selected}
                onChange={field.onChange}
                placeholder={field.placeholder}
              />
            ) : (
              <FilterSingleSelect
                label={field.label}
                options={field.options}
                value={field.value}
                onChange={field.onChange}
                accent={field.accent}
              />
            )}
          </div>
        ))}

        <div className={`flex items-end ${resetColSpanClass}`}>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className={`flex h-[46px] w-full items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-bold transition ${
              hasActiveFilters
                ? "cursor-pointer border-pro-slate-800 bg-pro-slate-950 text-slate-400 hover:bg-pro-slate-800 hover:text-white"
                : "cursor-not-allowed border-pro-slate-800 bg-pro-slate-950 text-slate-600"
            }`}
          >
            <RotateCcw className="size-3.5" />
            重置
          </button>
        </div>
      </div>
    </div>
  );
}

export function FilterPanel({
  fields,
  onReset,
  hasActiveFilters,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  mobileTitle = "篩選條件",
  mobileApplyLabel = (count) => `套用篩選 Apply (${count})`,
  resultCount = 0,
  resetColSpanClass,
}: FilterPanelProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleReset = () => {
    onReset();
    setIsFilterOpen(false);
  };

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setIsFilterOpen(true)}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-pro-slate-700 bg-pro-slate-900 py-3.5 text-sm font-bold text-slate-200 shadow-lg transition-all hover:bg-pro-slate-800 active:scale-95 md:hidden"
      >
        <SlidersHorizontal className="size-4" />
        {mobileTitle}
        {hasActiveFilters && (
          <span className="ml-1 h-2 w-2 rounded-full bg-blue-500" />
        )}
      </button>

      {/* Desktop panel */}
      <div className="relative z-30 mb-8 hidden rounded-3xl border border-pro-slate-800 bg-pro-slate-900 p-4 shadow-2xl sm:p-6 md:block">
        <FilterControls
          fields={fields}
          onReset={handleReset}
          hasActiveFilters={hasActiveFilters}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          resetColSpanClass={resetColSpanClass}
        />
      </div>

      {/* Mobile bottom sheet */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <button
            type="button"
            aria-label="Close filter panel"
            className="absolute inset-0 bg-pro-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-pro-slate-800 bg-pro-slate-950 p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 ease-out">
            
            {/* Mobile sheet header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">{mobileTitle}</h2>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-pro-slate-800 bg-pro-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <FilterControls
              fields={fields}
              onReset={handleReset}
              hasActiveFilters={hasActiveFilters}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              searchPlaceholder={searchPlaceholder}
              resetColSpanClass={resetColSpanClass}
            />

            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="mt-8 w-full rounded-xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-900/40 transition-all hover:bg-blue-500 active:scale-95"
            >
              {mobileApplyLabel(resultCount)}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
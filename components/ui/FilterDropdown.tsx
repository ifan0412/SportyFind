"use client";

import { useState } from "react";

interface FilterOption {
  id: string;
  name: string;
  value?: string;
}

interface FilterDropdownProps {
  label: string;
  displayText: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  isMultiSelect?: boolean;
}

export function FilterDropdown({
  label,
  displayText,
  options,
  selectedValues,
  onToggle,
  isMultiSelect = false,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      <label className="mb-1.5 block pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>

      {/* Trigger */}
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
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-[72px] left-0 right-0 z-50 flex max-h-60 flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-pro-slate-700 bg-pro-slate-800 py-1 shadow-2xl">
            {options.map((opt) => {
              const val = opt.value ?? opt.name;
              const isSelected = selectedValues.includes(val);

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onToggle(val);
                    if (!isMultiSelect) setIsOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-bold transition hover:bg-pro-slate-700 ${
                    isSelected
                      ? "bg-pro-slate-900/30 text-blue-400"
                      : "text-slate-300"
                  }`}
                >
                  {isMultiSelect ? (
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition ${
                          isSelected
                            ? "border-pro-blue-600 bg-pro-blue-600"
                            : "border-pro-slate-600 bg-pro-slate-900"
                        }`}
                      >
                        {isSelected && (
                          <span className="text-[9px] text-white">✓</span>
                        )}
                      </span>
                      {opt.name}
                    </span>
                  ) : (
                    <>
                      <span>{opt.name}</span>
                      {isSelected && (
                        <span className="text-[10px] text-blue-500">✓</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
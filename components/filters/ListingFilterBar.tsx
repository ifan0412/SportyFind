"use client";

import { SlidersHorizontal } from "lucide-react";
import type { MobileFilterAccent } from "./types";

interface ListingFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  onFilterOpen: () => void;
  hasActiveFilters?: boolean;
  accent?: MobileFilterAccent;
  className?: string;
  /** Desktop-only filter controls (hidden on mobile). */
  children?: React.ReactNode;
  /** Extra mobile-only content beside search (e.g. create button). */
  mobileTrailing?: React.ReactNode;
}

const focusRing: Record<MobileFilterAccent, string> = {
  blue: "focus:border-blue-500",
  orange: "focus:border-orange-500",
  green: "focus:border-green-500",
  yellow: "focus:border-yellow-500",
  amber: "focus:border-amber-500",
  purple: "focus:border-purple-500",
};

const activeDot: Record<MobileFilterAccent, string> = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
};

export function ListingFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onFilterOpen,
  hasActiveFilters = false,
  accent = "blue",
  className = "",
  children,
  mobileTrailing,
}: ListingFilterBarProps) {
  return (
    <>
      {/* Mobile: compact search + filter button */}
      <div className={`flex items-center gap-2 md:hidden ${className}`}>
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none transition ${focusRing[accent]}`}
          />
        </div>
        <button
          type="button"
          onClick={onFilterOpen}
          aria-label="開啟篩選"
          className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border border-slate-700 bg-slate-950 text-zinc-300 hover:border-slate-500 hover:text-white transition"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hasActiveFilters && (
            <span
              className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${activeDot[accent]} shadow-[0_0_6px_currentColor]`}
            />
          )}
        </button>
        {mobileTrailing}
      </div>

      {/* Desktop: full filter row */}
      {children && (
        <div className="hidden md:block">{children}</div>
      )}
    </>
  );
}

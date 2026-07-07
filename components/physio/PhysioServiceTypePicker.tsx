"use client";

import { PHYSIO_SERVICE_TYPES, filterPhysioServiceTypeTags } from "@/lib/physio-service-types";

const chipBase =
  "px-3 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer";

export function PhysioServiceTypePicker({
  value,
  onChange,
  minSelected = 0,
}: {
  value: string[];
  onChange: (types: string[]) => void;
  minSelected?: number;
}) {
  const toggle = (type: string) => {
    if (value.includes(type)) {
      if (minSelected > 0 && value.length <= minSelected) return;
      onChange(value.filter((t) => t !== type));
    } else {
      onChange([...value, type]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PHYSIO_SERVICE_TYPES.map((type) => {
        const selected = value.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggle(type)}
            className={`${chipBase} ${
              selected
                ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
            }`}
          >
            {type}
          </button>
        );
      })}
      {value.length > 0 && (
        <p className="w-full text-[11px] text-zinc-600 mt-1">已選 {value.length} 個類別</p>
      )}
    </div>
  );
}

const badgeSizes = {
  xs: "text-[10px] px-2 py-0.5",
  sm: "text-xs px-3 py-1",
};

export function PhysioServiceTypeBadge({
  type,
  size = "sm",
}: {
  type: string | null | undefined;
  size?: "xs" | "sm";
}) {
  if (!type?.trim() || !(PHYSIO_SERVICE_TYPES as readonly string[]).includes(type.trim())) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full font-black border tracking-wider bg-emerald-500/15 text-emerald-400 border-emerald-500/30 whitespace-nowrap ${badgeSizes[size]}`}
    >
      {type}
    </span>
  );
}

export function PhysioServiceTypeBadges({
  types,
  size = "sm",
  max = 4,
}: {
  types: string[];
  size?: "xs" | "sm";
  max?: number;
}) {
  const unique = filterPhysioServiceTypeTags([...new Set(types.filter(Boolean))]);
  if (!unique.length) return null;
  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((type) => (
        <PhysioServiceTypeBadge key={type} type={type} size={size} />
      ))}
      {extra > 0 && (
        <span className={`text-zinc-500 font-bold ${size === "xs" ? "text-[10px]" : "text-xs"}`}>
          +{extra}
        </span>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import type { MobileFilterAccent } from "./types";

interface MultiSelectFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: { id: string; label: string }[];
  selected: string[];
  onApply: (selected: string[]) => void;
  accent?: MobileFilterAccent;
}

const accentStyles: Record<
  MobileFilterAccent,
  { chipOn: string; apply: string }
> = {
  blue: {
    chipOn: "bg-blue-600/15 border-blue-500 text-blue-300",
    apply: "bg-blue-600 hover:bg-blue-500",
  },
  orange: {
    chipOn: "bg-orange-600/15 border-orange-500 text-orange-300",
    apply: "bg-orange-600 hover:bg-orange-500",
  },
  green: {
    chipOn: "bg-green-600/15 border-green-500 text-green-300",
    apply: "bg-green-600 hover:bg-green-500",
  },
  yellow: {
    chipOn: "bg-yellow-600/15 border-yellow-500 text-yellow-300",
    apply: "bg-yellow-600 hover:bg-yellow-500",
  },
  amber: {
    chipOn: "bg-amber-600/15 border-amber-500 text-amber-300",
    apply: "bg-amber-600 hover:bg-amber-500",
  },
  purple: {
    chipOn: "bg-purple-600/15 border-purple-500 text-purple-300",
    apply: "bg-purple-600 hover:bg-purple-500",
  },
};

const chipBase = "px-4 py-2.5 rounded-full text-sm font-bold transition border";

export function MultiSelectFilterModal({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  selected,
  onApply,
  accent = "blue",
}: MultiSelectFilterModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const styles = accentStyles[accent];

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useBodyScrollLock(isOpen && isMobile);

  useEffect(() => {
    if (isOpen) setTempSelected(selected);
  }, [isOpen, selected]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setTempSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col md:items-center md:justify-center md:p-4 md:z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full h-full md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-3xl bg-slate-900 shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-black text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-zinc-500 font-medium mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl font-bold px-2"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5">
          <div className="flex flex-wrap gap-2.5 content-start">
            {options.map((opt) => {
              const isSelected = tempSelected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`${chipBase} ${
                    isSelected
                      ? styles.chipOn
                      : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 p-4 pt-3 border-t border-slate-800 flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setTempSelected([])}
            className="px-5 py-3.5 rounded-xl text-zinc-400 font-bold bg-slate-800 hover:bg-slate-700 transition shrink-0 text-sm"
          >
            清除
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(tempSelected);
              onClose();
            }}
            className={`flex-1 px-5 py-3.5 rounded-xl text-white font-black transition text-sm ${styles.apply}`}
          >
            顯示 {tempSelected.length > 0 ? `(${tempSelected.length})` : "全部"} 結果
          </button>
        </div>
      </div>
    </div>
  );
}

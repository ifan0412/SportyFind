"use client";

import { useState, useEffect } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

export interface CategoryFilterOption {
  id: string;
  label: string;
}

interface CategoryFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: CategoryFilterOption[];
  selected: string[];
  onApply: (selected: string[]) => void;
  accent?: "blue" | "yellow" | "orange" | "amber";
}

const chipBase = "rounded-full text-sm font-bold transition border";

const accentMap = {
  blue: { on: "bg-blue-600/15 border-blue-500 text-blue-300", off: "bg-slate-950 border-slate-800 text-zinc-400" },
  yellow: { on: "bg-yellow-600/15 border-yellow-500 text-yellow-300", off: "bg-slate-950 border-slate-800 text-zinc-400" },
  orange: { on: "bg-orange-600/15 border-orange-500 text-orange-300", off: "bg-slate-950 border-slate-800 text-zinc-400" },
  amber: { on: "bg-orange-600/15 border-orange-500 text-orange-300", off: "bg-slate-950 border-slate-800 text-zinc-400" },
  violet: { on: "bg-yellow-600/15 border-yellow-500 text-yellow-300", off: "bg-slate-950 border-slate-800 text-zinc-400" },
};

export function CategoryFilterModal({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  selected,
  onApply,
  accent = "blue",
}: CategoryFilterModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const colors = accentMap[accent];

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
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full h-full md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-3xl bg-slate-900 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-black text-white">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-500 font-medium mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white text-2xl font-bold px-2">
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
                  className={`${chipBase} px-4 py-2.5 ${isSelected ? colors.on : colors.off}`}
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
            className="flex-1 px-5 py-3.5 rounded-xl text-white font-black bg-blue-600 hover:bg-blue-500 transition text-sm"
          >
            顯示 {tempSelected.length > 0 ? `(${tempSelected.length})` : "全部"} 結果
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { SPORT_CATEGORIES } from "@/lib/sports-categories";

interface SportFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSports: string[];
  onApply: (selected: string[]) => void;
}

const chipBase = "px-4 py-2.5 rounded-full text-sm font-bold transition border";

export function SportFilterModal({
  isOpen,
  onClose,
  selectedSports,
  onApply,
}: SportFilterModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useBodyScrollLock(isOpen && isMobile);

  useEffect(() => {
    if (isOpen) setTempSelected(selectedSports);
  }, [isOpen, selectedSports]);

  if (!isOpen) return null;

  const toggleSport = (id: string) => {
    setTempSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col md:items-center md:justify-center md:p-4 md:z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full h-full md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-3xl bg-slate-900 shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-black text-white">篩選運動項目</h3>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              可多選 · 已選 {tempSelected.length} 項
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white text-2xl font-bold px-2">
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5">
          <div className="flex flex-wrap gap-2.5 content-start">
            {SPORT_CATEGORIES.map((sport) => {
              const isSelected = tempSelected.includes(sport.id);
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => toggleSport(sport.id)}
                  className={`${chipBase} ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500 text-blue-300"
                      : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  {sport.emoji} {sport.labelZh}
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

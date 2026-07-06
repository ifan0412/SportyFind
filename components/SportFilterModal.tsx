"use client";

import { useState, useEffect } from "react";
import { SPORT_CATEGORIES } from "@/lib/sports-categories";

interface SportFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSports: string[];
  onApply: (selected: string[]) => void;
}

const chipBase =
  "px-3 py-1.5 rounded-full text-xs font-bold transition border";

export function SportFilterModal({
  isOpen,
  onClose,
  selectedSports,
  onApply,
}: SportFilterModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([]);

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
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-lg bg-slate-900 md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[70vh]">
        <div className="w-full flex justify-center py-3 md:hidden">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-white">篩選運動項目</h3>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
              可多選 · 已選 {tempSelected.length} 項
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl font-bold px-2">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
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

        <div className="p-3 border-t border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setTempSelected([])}
            className="px-4 py-2.5 rounded-xl text-zinc-400 font-bold bg-slate-800 hover:bg-slate-700 transition shrink-0 text-sm"
          >
            清除
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(tempSelected);
              onClose();
            }}
            className="flex-1 px-4 py-2.5 rounded-xl text-white font-black bg-blue-600 hover:bg-blue-500 transition text-sm"
          >
            顯示 {tempSelected.length > 0 ? `(${tempSelected.length})` : "全部"} 結果
          </button>
        </div>
      </div>
    </>
  );
}

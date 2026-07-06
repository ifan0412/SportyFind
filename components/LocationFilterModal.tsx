"use client";

import { useState, useEffect, useMemo } from "react";
import { HK_AREAS } from "@/lib/hk-locations";

export interface LocationFilterOption {
  id: string;
  label: string;
  area: string;
}

interface LocationFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  allLocations: LocationFilterOption[];
  selectedLocations: string[];
  onApply: (selected: string[]) => void;
}

export function LocationFilterModal({
  isOpen,
  onClose,
  allLocations,
  selectedLocations,
  onApply,
}: LocationFilterModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) setTempSelected(selectedLocations);
  }, [isOpen, selectedLocations]);

  const grouped = useMemo(() => {
    return HK_AREAS.map((area) => ({
      ...area,
      items: allLocations.filter((l) => l.area === area.id),
    })).filter((g) => g.items.length > 0);
  }, [allLocations]);

  if (!isOpen) return null;

  const toggleLocation = (id: string) => {
    setTempSelected((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-lg bg-slate-900 md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="w-full flex justify-center py-3 md:hidden">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-white">篩選地區</h3>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              香港 18 區（已選 {tempSelected.length} 項）
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl font-bold px-2">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {grouped.map((group) => (
            <div key={group.id}>
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-wider">
                {group.labelZh} · {group.labelEn}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((loc) => {
                  const isSelected = tempSelected.includes(loc.id);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => toggleLocation(loc.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                        isSelected
                          ? "bg-amber-600/10 border-amber-500 text-amber-400"
                          : "bg-slate-950/50 border-slate-800 text-zinc-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="truncate mr-1">{loc.label.split(" ")[0]}</span>
                      {isSelected && <span className="text-amber-400 shrink-0">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 flex gap-3">
          <button
            type="button"
            onClick={() => setTempSelected([])}
            className="px-6 py-3 rounded-xl text-zinc-400 font-bold bg-slate-800 hover:bg-slate-700 transition shrink-0"
          >
            清除
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(tempSelected);
              onClose();
            }}
            className="flex-1 px-6 py-3 rounded-xl text-white font-black bg-amber-600 hover:bg-amber-500 transition"
          >
            顯示 {tempSelected.length > 0 ? `(${tempSelected.length})` : "全部"} 結果
          </button>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
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
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full h-full md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-3xl bg-slate-900 shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-black text-white">篩選地區</h3>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              香港 18 區 · 已選 {tempSelected.length} 項
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white text-2xl font-bold px-2">
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-y-auto p-3 md:p-5 space-y-3 md:space-y-4">
          {grouped.map((group) => (
            <div key={group.id}>
              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1.5 tracking-wider">
                {group.labelZh}
              </p>
              <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                {group.items.map((loc) => {
                  const isSelected = tempSelected.includes(loc.id);
                  const shortLabel = loc.label.split(" ")[0];
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => toggleLocation(loc.id)}
                      className={`flex items-center justify-center px-1.5 py-2.5 md:py-3 rounded-xl border text-sm font-bold transition-all text-center leading-tight ${
                        isSelected
                          ? "bg-amber-600/15 border-amber-500 text-amber-300"
                          : "bg-slate-950/50 border-slate-800 text-zinc-400 hover:border-slate-600"
                      }`}
                    >
                      <span className="truncate">{shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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
            className="flex-1 px-5 py-3.5 rounded-xl text-white font-black bg-amber-600 hover:bg-amber-500 transition text-sm"
          >
            顯示 {tempSelected.length > 0 ? `(${tempSelected.length})` : "全部"} 結果
          </button>
        </div>
      </div>
    </div>
  );
}

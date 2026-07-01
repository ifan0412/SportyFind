// 建立檔案: components/LocationFilterModal.tsx
"use client";

import { useState, useEffect } from "react";

interface LocationFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  allLocations: string[];
  selectedLocations: string[];
  onApply: (selected: string[]) => void;
}

export function LocationFilterModal({ isOpen, onClose, allLocations, selectedLocations, onApply }: LocationFilterModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedLocations);
    }
  }, [isOpen, selectedLocations]);

  if (!isOpen) return null;

  const toggleLocation = (loc: string) => {
    setTempSelected(prev => 
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const handleApply = () => {
    onApply(tempSelected);
    onClose();
  };

  const handleClear = () => {
    setTempSelected([]);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-md bg-slate-900 md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] animate-slideUp md:animate-fadeIn">
        
        <div className="w-full flex justify-center py-3 md:hidden">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-white">篩選地區</h3>
            <p className="text-xs text-zinc-500 font-medium mt-1">可選擇多區 (已選 {tempSelected.length} 項)</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl font-bold px-2">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {allLocations.map(loc => {
              const isSelected = tempSelected.includes(loc);
              return (
                <button
                  key={loc}
                  onClick={() => toggleLocation(loc)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm font-bold transition-all ${
                    isSelected 
                      ? "bg-amber-600/10 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                      : "bg-slate-950/50 border-slate-800 text-zinc-400 hover:border-slate-700"
                  }`}
                >
                  <span className="truncate mr-2">{loc}</span>
                  {isSelected && <span className="text-amber-400">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 md:rounded-b-3xl flex gap-3">
          <button onClick={handleClear} className="px-6 py-3 rounded-xl text-zinc-400 font-bold bg-slate-800 hover:bg-slate-700 transition flex-shrink-0">
            清除
          </button>
          <button onClick={handleApply} className="flex-1 px-6 py-3 rounded-xl text-white font-black bg-amber-600 hover:bg-amber-500 transition shadow-[0_0_15px_rgba(245,158,11,0.4)]">
            顯示 {tempSelected.length > 0 ? `(${tempSelected.length})` : "全部"} 結果
          </button>
        </div>
      </div>
    </>
  );
}
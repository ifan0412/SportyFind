// 建立檔案: components/SportFilterModal.tsx
"use client";

import { useState, useEffect } from "react";

interface SportFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  allSports: string[];
  selectedSports: string[];
  onApply: (selected: string[]) => void;
}

export function SportFilterModal({ isOpen, onClose, allSports, selectedSports, onApply }: SportFilterModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  // 每次打開時，同步外部已經選好的狀態
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedSports);
    }
  }, [isOpen, selectedSports]);

  if (!isOpen) return null;

  const toggleSport = (sport: string) => {
    setTempSelected(prev => 
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
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
      {/* 背景遮罩 (手機版 & 桌機版共用) */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose} 
      />

      {/* 彈出視窗：桌機版置中，手機版由下往上滑出 */}
      <div className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-md bg-slate-900 md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] animate-slideUp md:animate-fadeIn">
        
        {/* 手機版頂部的拖曳把手提示 */}
        <div className="w-full flex justify-center py-3 md:hidden">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-white">篩選運動項目</h3>
            <p className="text-xs text-zinc-500 font-medium mt-1">可選擇多項 (已選 {tempSelected.length} 項)</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl font-bold px-2">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {allSports.map(sport => {
              const isSelected = tempSelected.includes(sport);
              return (
                <button
                  key={sport}
                  onClick={() => toggleSport(sport)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm font-bold transition-all ${
                    isSelected 
                      ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.2)]" 
                      : "bg-slate-950/50 border-slate-800 text-zinc-400 hover:border-slate-700"
                  }`}
                >
                  <span className="truncate mr-2">{sport}</span>
                  {isSelected && <span className="text-blue-400">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 md:rounded-b-3xl flex gap-3">
          <button onClick={handleClear} className="px-6 py-3 rounded-xl text-zinc-400 font-bold bg-slate-800 hover:bg-slate-700 transition flex-shrink-0">
            清除
          </button>
          <button onClick={handleApply} className="flex-1 px-6 py-3 rounded-xl text-white font-black bg-blue-600 hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            顯示 {tempSelected.length > 0 ? `(${tempSelected.length})` : "全部"} 結果
          </button>
        </div>
      </div>
    </>
  );
}
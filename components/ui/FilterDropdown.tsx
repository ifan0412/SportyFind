"use client";

import { useState } from "react";

interface FilterDropdownProps {
  label: string;
  displayText: string;
  options: { id: string; name: string; value?: string }[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  isMultiSelect?: boolean;
}

export const FilterDropdown = ({ label, displayText, options, selectedValues, onToggle, isMultiSelect = false }: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 pl-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs sm:text-sm font-black text-blue-400 cursor-pointer flex justify-between items-center h-[46px]"
      >
        <span className="truncate pr-2">{displayText}</span>
        <span className="text-slate-500 text-[10px]">{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[72px] left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto flex flex-col py-1 animate-fadeIn">
            {options.map((opt) => {
              const val = opt.value || opt.name;
              const isSelected = selectedValues.includes(val);
              
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    onToggle(val);
                    // 如果是單選，點擊後自動關閉選單；多選則保持開啟讓你繼續勾
                    if (!isMultiSelect) setIsOpen(false);
                  }}
                  className={`px-4 py-3 text-xs font-bold cursor-pointer flex items-center justify-between hover:bg-slate-700 transition duration-150 ${isSelected ? "text-blue-400 bg-slate-900/30" : "text-slate-300"}`}
                >
                  {/* 根據是否為多選，渲染不同的視覺效果 */}
                  {isMultiSelect ? (
                    <span className="flex items-center gap-2.5">
                      {/* 方形 Checkbox 視覺 */}
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition border ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-slate-900 border-slate-600'}`}>
                        {isSelected && <span className="text-white text-[9px]">✓</span>}
                      </div>
                      {opt.name}
                    </span>
                  ) : (
                    <>
                      {/* 單選視覺 */}
                      <span>{opt.name}</span>
                      {isSelected && <span className="text-blue-500 text-[10px]">✓</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
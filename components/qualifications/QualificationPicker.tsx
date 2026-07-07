"use client";

import { QualificationBadges } from "@/components/qualifications/QualificationBadges";

const chipBase =
  "px-3 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer text-left";

interface QualificationPickerProps {
  options: readonly string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
  accent?: "orange" | "green" | "amber" | "emerald";
  customPlaceholder?: string;
}

export function QualificationPicker({
  options,
  selectedTags,
  onTagsChange,
  customValue,
  onCustomChange,
  accent = "orange",
  customPlaceholder = "例如：香港大學運動科學系畢業、NSCA-CSCS…",
}: QualificationPickerProps) {
  const resolvedAccent = accent === "amber" ? "orange" : accent === "emerald" ? "green" : accent;
  const selectedStyle =
    resolvedAccent === "green"
      ? "bg-green-600/20 border-green-500 text-green-300"
      : "bg-orange-600/20 border-orange-500 text-orange-300";

  const toggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2 pl-1">
          選擇資歷 / 認證（可多選，將顯示於名錄卡片標籤）
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const selected = selectedTags.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={`${chipBase} ${
                  selected
                    ? selectedStyle
                    : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {selectedTags.length > 0 && (
          <p className="text-[11px] text-zinc-600 mt-2 pl-1">已選 {selectedTags.length} 項</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">
          其他資歷（自由填寫）
        </label>
        <p className="text-[10px] text-zinc-600 pl-1 mb-1">
          顯示於您的公開名片，不會以標籤形式出現在名錄列表
        </p>
        <input
          type="text"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder={customPlaceholder}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-slate-500 transition outline-none placeholder:text-zinc-600"
        />
      </div>

      {selectedTags.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2 pl-1">名錄預覽標籤</p>
          <QualificationBadges tags={selectedTags} accent={accent} size="xs" max={6} />
        </div>
      )}
    </div>
  );
}

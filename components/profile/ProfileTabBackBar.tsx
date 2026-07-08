"use client";

interface ProfileTabBackBarProps {
  title: string;
  emoji?: string;
  subtitle?: string;
  onBack: () => void;
}

export function ProfileTabBackBar({ title, emoji, subtitle = "專屬私密空間", onBack }: ProfileTabBackBarProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-3 md:p-4 rounded-2xl flex items-center justify-between w-full shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        {emoji && (
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl shrink-0">
            {emoji}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm md:text-base font-black text-white leading-tight truncate">{title}</h2>
          <p className="text-[10px] text-zinc-400 font-bold tracking-wider mt-0.5">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-zinc-300 hover:text-white text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0"
      >
        返回 ↗
      </button>
    </div>
  );
}

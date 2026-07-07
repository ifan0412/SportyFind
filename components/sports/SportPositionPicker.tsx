"use client";

const chipBase =
  "px-3 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer";

export function SportPositionPicker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (positions: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`${chipBase} ${
              selected
                ? "bg-blue-600/20 border-blue-500 text-blue-300"
                : "bg-slate-950 border-slate-800 text-zinc-400 hover:border-slate-600 hover:text-white"
            }`}
          >
            {opt}
          </button>
        );
      })}
      {value.length > 0 && (
        <p className="w-full text-[11px] text-zinc-600 mt-1">已選 {value.length} 個位置</p>
      )}
    </div>
  );
}

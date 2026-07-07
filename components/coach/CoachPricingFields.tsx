"use client";

import {
  SERVICE_PRICING_MODES,
  type ServicePricingMode,
  normalizeServicePricingMode,
} from "@/lib/coach-pricing";

interface CoachPricingFieldsProps {
  pricingMode: string | null | undefined;
  price: number | string | null | undefined;
  onPricingModeChange: (mode: ServicePricingMode) => void;
  onPriceChange: (value: number | "") => void;
  showTip?: boolean;
  accent?: "amber" | "emerald";
  audience?: "student" | "patient";
}

const ACCENT_SELECTED = {
  amber: "bg-amber-600/20 border-amber-500 text-amber-300",
  emerald: "bg-emerald-600/20 border-emerald-500 text-emerald-300",
} as const;

const ACCENT_TIP = {
  amber: "border-amber-500/25 bg-amber-950/20 text-amber-200/90",
  emerald: "border-emerald-500/25 bg-emerald-950/20 text-emerald-200/90",
} as const;

export function CoachPricingFields({
  pricingMode,
  price,
  onPricingModeChange,
  onPriceChange,
  showTip = true,
  accent = "amber",
  audience = "student",
}: CoachPricingFieldsProps) {
  const mode = normalizeServicePricingMode(pricingMode);
  const unitMeta = SERVICE_PRICING_MODES.find((m) => m.id === mode)!;
  const audienceLabel = audience === "patient" ? "患者" : "學員";

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">
          收費方式
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SERVICE_PRICING_MODES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPricingModeChange(opt.id)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                mode === opt.id
                  ? ACCENT_SELECTED[accent]
                  : "bg-slate-900 border-slate-800 text-zinc-400 hover:border-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {mode !== "dm" ? (
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">
            標價（{unitMeta.unitLabel}）
          </label>
          <input
            type="number"
            min={0}
            value={price ?? ""}
            onChange={(e) =>
              onPriceChange(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder={mode === "session" ? "例如：800" : "例如：500"}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-emerald-400 font-black placeholder:text-zinc-600"
          />
        </div>
      ) : (
        <p className="text-xs text-zinc-500 font-medium px-1">
          {audienceLabel}需發送諮詢單後再與您確認報價。
        </p>
      )}

      {showTip && (
        <div
          className={`rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed font-medium ${ACCENT_TIP[accent]}`}
        >
          💡 列出明確價格通常能提升{audienceLabel}發送諮詢的意願；若項目內容差異大，可選「私訊詢價」。
        </div>
      )}
    </div>
  );
}

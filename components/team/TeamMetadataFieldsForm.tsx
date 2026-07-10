"use client";

import type { SportCategory } from "@/types/team";
import { SPORT_CATEGORIES } from "@/lib/sports-categories";
import { getTeamMetaFields, TEAM_CARD_BIO_MAX } from "@/lib/team-metadata-fields";
import { FormSelect } from "@/components/ui/form-select";
import { HKDistrictPicker } from "@/components/location/HKDistrictPicker";

const inputCls =
  "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition";
const labelCls = "block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 pl-1";

interface TeamMetadataFieldsFormProps {
  sportCategory: SportCategory;
  metadata: Record<string, string | boolean | string[]>;
  estYear: string;
  onEstYearChange: (value: string) => void;
  onMetadataChange: (metadata: Record<string, string | boolean | string[]>) => void;
}

export function TeamMetadataFieldsForm({
  sportCategory,
  metadata,
  estYear,
  onEstYearChange,
  onMetadataChange,
}: TeamMetadataFieldsFormProps) {
  const metaFields = getTeamMetaFields(sportCategory);
  const sport = SPORT_CATEGORIES.find((s) => s.id === sportCategory);

  const setMeta = (key: string, value: string | boolean | string[]) => {
    onMetadataChange({ ...metadata, [key]: value });
  };

  const locationDistricts = (metadata.location_regions as string[] | undefined) ?? [];
  const locationSubdistricts = (metadata.location_subdistricts as string[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <span className="text-2xl">{sport?.emoji ?? "🏅"}</span>
        <div>
          <p className="text-sm font-black text-white">{sport?.labelZh ?? sportCategory}</p>
          <p className="text-[10px] text-zinc-500">運動種類建立後不可變更。以下為對外顯示的群組規格資訊。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>成立年份</label>
          <input
            type="number"
            className={inputCls}
            placeholder="例如：2022"
            min={1900}
            max={new Date().getFullYear()}
            value={estYear}
            onChange={(e) => onEstYearChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>活動地區 <span className="normal-case font-normal text-zinc-600">(選填)</span></label>
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
          <HKDistrictPicker
            districts={locationDistricts}
            subdistricts={locationSubdistricts}
            onDistrictsChange={() => {}}
            onSubdistrictsChange={() => {}}
            onSelectionChange={(districts, subdistricts) => {
              onMetadataChange({
                ...metadata,
                location_regions: districts,
                location_subdistricts: subdistricts,
              });
            }}
            hideSectionTitle
          />
        </div>
      </div>

      {metaFields.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-6 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
          此運動種類暫無專項規格欄位。
        </p>
      ) : (
        <div className="space-y-5">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider pl-1">🏐 群組規格資訊 <span className="normal-case font-normal text-zinc-600">(全部選填，留空則不顯示)</span></p>
          {metaFields.map((field) => (
            <div key={field.key}>
              <label className={labelCls}>{field.label}</label>
              {field.type === "text" && (
                <div>
                  <input
                    className={inputCls}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    value={(metadata[field.key] as string) ?? ""}
                    onChange={(e) => {
                      const next = field.maxLength
                        ? e.target.value.slice(0, field.maxLength)
                        : e.target.value;
                      setMeta(field.key, next);
                    }}
                  />
                  {field.maxLength ? (
                    <p className="mt-1.5 text-[10px] text-zinc-500 font-bold text-right">
                      {String((metadata[field.key] as string) ?? "").length}/{field.maxLength || TEAM_CARD_BIO_MAX}
                    </p>
                  ) : null}
                </div>
              )}
              {field.type === "select" && (
                <FormSelect
                  value={(metadata[field.key] as string) ?? ""}
                  onValueChange={(v) => setMeta(field.key, v)}
                  triggerClassName={inputCls}
                  placeholder="-- 請選擇 --"
                  options={field.options ?? []}
                />
              )}
              {field.type === "boolean" && (
                <label className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={(metadata[field.key] as boolean) ?? false}
                    onChange={(e) => setMeta(field.key, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/50 bg-slate-950"
                  />
                  <span className="text-sm text-slate-300 font-bold">是</span>
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { HKDistrictPicker } from "@/components/location/HKDistrictPicker";
import { GenderAvatarBadge } from "@/components/profile/GenderBadge";
import { PROFILE_GENDER_OPTIONS, type ProfileGender } from "@/lib/gender";
import { PROFILE_AGE_OPTIONS } from "@/lib/profile-age";
import { isHongKongCountry } from "@/lib/hk-locations";

interface ProfileEditTabProps {
  editForm: Record<string, unknown>;
  setEditForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  locationData: Record<string, string[]>;
  handleStatus: "idle" | "checking" | "available" | "taken";
  isSaving: boolean;
  avatarSrc: string;
  onAvatarClick: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ProfileEditTab({
  editForm,
  setEditForm,
  locationData,
  handleStatus,
  isSaving,
  avatarSrc,
  onAvatarClick,
  onSave,
  onCancel,
}: ProfileEditTabProps) {
  const form = editForm as Record<string, any>;

  return (
    <div className="animate-fadeIn space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg md:text-xl font-black text-white">編輯個人檔案</h2>
        <p className="text-xs text-zinc-500 mt-1">更新基本資料、身分與公開狀態。</p>
      </div>

      <div className="flex flex-col items-center gap-3 p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
        <div className="relative w-24 h-24 overflow-visible">
          <div
            className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : undefined }}
          >
            {!avatarSrc && (
              <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-600">
                {(form.first_name as string)?.[0] || "P"}
              </div>
            )}
          </div>
          <GenderAvatarBadge gender={form.gender as string} size="sm" />
        </div>
        <button
          type="button"
          onClick={onAvatarClick}
          className="text-xs font-bold text-blue-400 hover:text-blue-300 transition"
        >
          更換頭像
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">名字</label>
            <input
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm"
              value={form.first_name || ""}
              onChange={(e) => setEditForm({ ...form, first_name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">姓氏</label>
            <input
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm"
              value={form.last_name || ""}
              onChange={(e) => setEditForm({ ...form, last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">帳戶 ID (Handle)</label>
          <input
            className={`w-full bg-slate-950/50 border rounded-xl p-3 text-white text-sm ${
              handleStatus === "taken" ? "border-red-500" : "border-slate-800"
            }`}
            value={form.handle || ""}
            onChange={(e) =>
              setEditForm({ ...form, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })
            }
            placeholder="ID 帳號"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">Headline</label>
          <input
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm"
            value={form.headline || ""}
            onChange={(e) => setEditForm({ ...form, headline: e.target.value })}
            placeholder="例如: 網球底線玩家"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">
              性別 <span className="normal-case font-normal text-zinc-600">(顯示於報名與成員名單)</span>
            </label>
            <select
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm"
              value={form.gender || ""}
              onChange={(e) => setEditForm({ ...form, gender: e.target.value as ProfileGender })}
            >
              <option value="">請選擇</option>
              {PROFILE_GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">年齡</label>
            <select
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm"
              value={form.age != null && form.age !== "" ? String(form.age) : ""}
              onChange={(e) => setEditForm({ ...form, age: e.target.value })}
            >
              {PROFILE_AGE_OPTIONS.map((opt) => (
                <option key={opt.value || "unset"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pl-1">
          <input
            type="checkbox"
            checked={!!form.show_age}
            onChange={(e) => setEditForm({ ...form, show_age: e.target.checked })}
            className="rounded bg-slate-900 border-slate-700"
          />
          <span className="text-xs font-bold text-zinc-300">在個人檔案公開顯示年齡</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">身高 (cm)</label>
            <input
              type="number"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm"
              value={form.height_cm || ""}
              onChange={(e) => setEditForm({ ...form, height_cm: e.target.value })}
              placeholder="例: 178"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">體重 (kg)</label>
            <input
              type="number"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm"
              value={form.weight_kg || ""}
              onChange={(e) => setEditForm({ ...form, weight_kg: e.target.value })}
              placeholder="例: 70"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">國家</label>
            <select
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm"
              value={form.country || ""}
              onChange={(e) =>
                setEditForm({ ...form, country: e.target.value, region: "", districts: [], subdistricts: [] })
              }
            >
              <option value="">選擇國家</option>
              {Object.keys(locationData).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {!isHongKongCountry(form.country) && (
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">地區</label>
              <select
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm"
                value={form.region || ""}
                onChange={(e) => setEditForm({ ...form, region: e.target.value })}
              >
                <option value="">選擇區域</option>
                {form.country &&
                  locationData[form.country]?.map((r: string) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {isHongKongCountry(form.country) && (
          <div className="space-y-1.5 p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
            <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">香港地區（可多選）</label>
            <HKDistrictPicker
              districts={form.districts || []}
              subdistricts={form.subdistricts || []}
              onDistrictsChange={() => {}}
              onSubdistrictsChange={() => {}}
              onSelectionChange={(d, s) => setEditForm((prev: any) => ({ ...prev, districts: d, subdistricts: s }))}
              hideSectionTitle
              minDistricts={0}
            />
          </div>
        )}

        <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-4">
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase pl-1 block mb-2">運動員/一般狀態</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
              value={form.status_tag || "committed"}
              onChange={(e) => setEditForm({ ...form, status_tag: e.target.value })}
            >
              <option value="recruiting">🟢 尋找新血</option>
              <option value="seeking_team">🔵 尋找隊伍</option>
              <option value="open_to_match">🟡 開放約戰</option>
              <option value="committed">⚪ 穩定狀態</option>
              <option value="hidden">🔒 未發布 (隱藏中)</option>
            </select>
          </div>
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.show_physical_stats}
                onChange={(e) => setEditForm({ ...form, show_physical_stats: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-bold text-zinc-300">公開展示身高體重數據</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.is_player}
                onChange={(e) => setEditForm({ ...form, is_player: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-bold text-blue-400">開啟運動員球員檔案</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.is_coach}
                onChange={(e) => setEditForm({ ...form, is_coach: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-bold text-amber-400">開啟教練管理功能</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.is_physio}
                onChange={(e) => setEditForm({ ...form, is_physio: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-bold text-emerald-400">開啟運動/物理治療功能</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || handleStatus === "taken"}
            className="flex-1 bg-slate-50 hover:bg-slate-200 text-black font-black py-3 rounded-xl disabled:opacity-50"
          >
            {isSaving ? "同步中..." : "儲存變更"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 bg-slate-800 text-zinc-300 font-bold rounded-xl hover:bg-slate-700"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

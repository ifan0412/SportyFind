"use client";

import { HKDistrictPicker } from "@/components/location/HKDistrictPicker";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PhysioServiceTypePicker } from "@/components/physio/PhysioServiceTypePicker";
import { normalizePhysioProfileTags } from "@/lib/physio-service-types";
import { BIO_CHAR_SUGGESTED_MAX, BIO_CHAR_SUGGESTED_RANGE } from "@/lib/content/body";
import { FormSelect } from "@/components/ui/form-select";
import { SocialConnectPanel } from "@/components/profile/SocialConnectPanel";

interface PhysioTabProps {
  editForm?: any;
  onFieldChange?: (field: string, value: any) => void;
  onSaveGlobal?: () => void;
  isSaving?: boolean;
  avatarSrc?: string;
  profile?: any;
  // 👇 把這行補上去：
  locationData?: any; 
}

export function PhysioTab({ 
  editForm, 
  onFieldChange, 
  onSaveGlobal, 
  isSaving, 
  avatarSrc, 
  profile,
  locationData, // ✅ 確保這裡有接收
  }: PhysioTabProps) {
  if (!editForm || !onFieldChange) return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── 頂部標題 ── */}
      <div className="mb-4">
        <h2 className="text-lg md:text-xl font-black text-white">防護員 / 物理治療名片設定</h2>
        <p className="text-[10px] md:text-xs text-zinc-500 mt-1">完善您的專業資歷與服務項目，建立客戶信任感。</p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 mb-8 shadow-sm space-y-8">
        
        {/* 1️⃣ 基本收費與狀態 */}
        <div>
          <h3 className="text-sm font-black text-emerald-400 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span> 基本資訊
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">狀態</label>
              <FormSelect
                value={editForm.physio_status || "hidden"}
                onValueChange={(v) => onFieldChange?.("physio_status", v)}
                triggerClassName="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors outline-none"
                options={[
                  { value: "available", label: "🟢 開放預約" },
                  { value: "full", label: "🔴 滿診中" },
                  { value: "hidden", label: "🔒 未發布 (隱藏)" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">所屬診所 / 工作室名稱</label>
              <input
                type="text"
                value={editForm.clinic_name || ""}
                onChange={(e) => onFieldChange("clinic_name", e.target.value)}
                placeholder="例如: 獨立接案 / 某某物理治療所"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2️⃣ 專業資歷與服務 */}
        <div className="pt-6 border-t border-slate-800/80">
          <h3 className="text-sm font-black text-emerald-400 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span> 專業經歷與服務項目
          </h3>
          <div className="space-y-5">
            <div className="space-y-1.5 max-w-xs">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">從業年資 (年)</label>
              <input
                type="text"
                value={editForm.physio_experience_years || ""}
                onChange={(e) => onFieldChange("physio_experience_years", e.target.value)}
                placeholder="例如: 5"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">治療師專業簡介 (Physio Bio)</label>
              <RichTextEditor
                variant="compact"
                enableImages={false}
                value={editForm.physio_qualifications || ""}
                onChange={(html) => onFieldChange("physio_qualifications", html)}
                placeholder={`建議 ${BIO_CHAR_SUGGESTED_RANGE} 字，簡潔有力地介紹您的專業資歷與治療專長…`}
                showCharCount
                suggestedLength={BIO_CHAR_SUGGESTED_MAX}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">專業服務項目（可多選）</label>
              <p className="text-[10px] text-zinc-600 pl-1 mb-2">將顯示於治療師名片與名錄頁面</p>
              <PhysioServiceTypePicker
                value={normalizePhysioProfileTags(editForm.physio_service_tags, editForm.physio_services_offered)}
                onChange={(tags) => {
                  onFieldChange("physio_service_tags", tags);
                  onFieldChange("physio_services_offered", tags.join("、"));
                }}
              />
            </div>
          </div>
        </div>

        {/* 3️⃣ 對外聯絡與服務地點 */}
        <div className="pt-6 border-t border-slate-800/80">
          <h3 className="text-sm font-black text-emerald-400 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span> 聯絡與地點
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡信箱</label>
              <input type="email" value={editForm.physio_contact_email || ""} onChange={(e) => onFieldChange("physio_contact_email", e.target.value)} placeholder="physio@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡電話</label>
              <input type="tel" value={editForm.physio_contact_phone || ""} onChange={(e) => onFieldChange("physio_contact_phone", e.target.value)} placeholder="+852 9876 5432" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors outline-none" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">主要服務地區</label>
              <HKDistrictPicker
                districts={editForm.physio_districts || []}
                subdistricts={editForm.physio_subdistricts || []}
                onDistrictsChange={() => {}}
                onSubdistrictsChange={() => {}}
                onSelectionChange={(d, s) => {
                  onFieldChange("physio_districts", d);
                  onFieldChange("physio_subdistricts", s);
                }}
                hideSectionTitle
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">詳細地址</label>
              <input type="text" value={editForm.physio_address || ""} onChange={(e) => onFieldChange("physio_address", e.target.value)} placeholder="診所或工作室完整地址" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors outline-none" />
            </div>
          </div>
          
          <label className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
            <input type="checkbox" checked={editForm.physio_is_address_public ?? true} onChange={(e) => onFieldChange("physio_is_address_public", e.target.checked)} className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/50 bg-slate-950" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-200">公開詳細地址</span>
              <span className="text-[10px] md:text-xs text-slate-500">關閉後，名片上將只顯示「主要服務地區」。</span>
            </div>
          </label>
        </div>

        {/* 4️⃣ 社群媒體連結 — OAuth 連結（取代手動貼網址） */}
        <div className="pt-6 border-t border-slate-800/80">
          <SocialConnectPanel
            userId={editForm.id || editForm.user_id || profile?.id}
            context="physio"
            accent="emerald"
          />
        </div>

        {/* ✅ 專屬儲存按鈕 */}
        <div className="flex justify-end mt-8 pt-5 border-t border-slate-800/80">
          <button
            onClick={onSaveGlobal}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black px-8 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 flex items-center gap-2"
          >
            {isSaving ? "儲存中..." : "儲存"}
          </button>
        </div>

      </div>
    </div>
  );
}
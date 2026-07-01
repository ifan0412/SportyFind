"use client";

interface PhysioTabProps {
  editForm: {
    clinic_name: string;
    physio_rate: number | string;
    physio_country: string;
    physio_region: string;
    physio_status: string;
  };
  locationData: Record<string, string[]>;
  isSaving: boolean;
  avatarSrc: string;
  profile: { full_name: string | null } | null;
  onFieldChange: (field: string, value: any) => void;
  onSave: () => void;
}

export function PhysioTab({ editForm, locationData, isSaving, avatarSrc, profile, onFieldChange, onSave }: PhysioTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fadeIn">
      <div className="bg-slate-900/40 border border-slate-800 p-5 md:p-6 rounded-3xl h-fit">
        <h3 className="text-lg font-black text-white mb-6">設定醫療防護名片</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">診所/工作室名稱</label>
            <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={editForm.clinic_name} onChange={e => onFieldChange("clinic_name", e.target.value)} placeholder="例如: 運動復健所" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">單次收費 (HK$)</label>
            <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" placeholder="例如: 800" value={editForm.physio_rate} onChange={e => onFieldChange("physio_rate", e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">所在國家</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={editForm.physio_country} onChange={e => { onFieldChange("physio_country", e.target.value); onFieldChange("physio_region", ""); }}>
                <option value="">國家</option>
                {Object.keys(locationData).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">所在區域</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={editForm.physio_region} onChange={e => onFieldChange("physio_region", e.target.value)}>
                <option value="">區域</option>
                {editForm.physio_country && locationData[editForm.physio_country]?.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">預約狀態</label>
            <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={editForm.physio_status} onChange={e => onFieldChange("physio_status", e.target.value)}>
              <option value="available">🟢 開放預約</option>
              <option value="busy">🔴 滿診中</option>
              <option value="hidden">🔒 未發布 (隱藏中)</option>
            </select>
          </div>
          <button onClick={onSave} disabled={isSaving} className="w-full mt-4 bg-emerald-600 text-white font-black py-2.5 md:py-3 rounded-xl text-sm md:text-base shadow-md">
            {isSaving ? "儲存中..." : "儲存 / 發布名片"}
          </button>
        </div>
      </div>
      <div className="hidden xl:block">
        <h3 className="text-sm font-bold text-zinc-500 mb-4 px-2">公開列表預覽</h3>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20" />
          <div className="relative w-20 h-20 mb-5 mt-2">
            <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} />
          </div>
          <h3 className="text-lg font-black text-white">{profile?.full_name || "您的名稱"}</h3>
          <p className="text-xs text-zinc-400 mb-5 line-clamp-2">{editForm.clinic_name || "未登錄診所"}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4 w-full">
            <div className="bg-slate-950/50 border border-slate-800 text-zinc-400 text-xs font-bold px-3 py-1.5 rounded-lg truncate max-w-[140px]">📍 {editForm.physio_region ? `${editForm.physio_region}` : "地點未設"}</div>
            <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black px-3 py-1.5 rounded-lg">HK$ {editForm.physio_rate}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
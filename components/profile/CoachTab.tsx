"use client";

interface Sport { id: string; name: string; }
interface CoachProfile { id: string; sport: string; rate: number | string; status: string; country: string; region: string; }

interface CoachTabProps {
  coachProfiles: any[];
  allSports: any[];
  locationData: any;
  onAdd: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onSave: (coach: any) => void;
  onDelete: (id: string) => void;
  
  editForm?: any; 
  onFieldChange?: (field: string, value: any) => void;
  onSaveGlobal?: () => void; 
  isSaving?: boolean;       
}

export function CoachTab({ 
  coachProfiles, 
  allSports, 
  locationData, 
  onAdd, 
  onUpdate, 
  onSave, 
  onDelete,
  onSaveGlobal,  
  isSaving,       
  editForm,
  onFieldChange
}: CoachTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* ── 頂部標題 ── */}
      <div className="mb-4">
        <h2 className="text-lg md:text-xl font-black text-white">教練名片設定</h2>
        <p className="text-[10px] md:text-xs text-zinc-500 mt-1">管理您的全域聯絡資訊與各項專業收費標準。</p>
      </div>

      {/* ── 聯絡與服務地點表單 (全域教練設定) ── */}
      {editForm && onFieldChange && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 mb-8 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm md:text-base font-black text-white">對外聯絡與服務地點</h3>
            <p className="text-[10px] md:text-xs text-zinc-500 mt-1">此設定將套用於您所有的教練名片。填寫後請點擊下方的按鈕以儲存。</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡信箱</label>
              <input
                type="email"
                value={editForm.contact_email || ""}
                onChange={(e) => onFieldChange("contact_email", e.target.value)}
                placeholder="coach@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡電話 (選填)</label>
              <input
                type="tel"
                value={editForm.contact_phone || ""}
                onChange={(e) => onFieldChange("contact_phone", e.target.value)}
                placeholder="+852 9876 5432"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">主要服務地區</label>
              <input
                type="text"
                value={editForm.city_region || ""}
                onChange={(e) => onFieldChange("city_region", e.target.value)}
                placeholder="例如：九龍區 / 港島東"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">詳細地址 (場館/工作室)</label>
              <input
                type="text"
                value={editForm.address || ""}
                onChange={(e) => onFieldChange("address", e.target.value)}
                placeholder="例如：彌敦道 123 號 4 樓"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors outline-none"
              />
            </div>
          </div>

          {/* 隱私開關 (✅ 現在它正確閉合了) */}
          <label className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={editForm.is_address_public ?? true}
              onChange={(e) => onFieldChange("is_address_public", e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/50 bg-slate-950"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-200">公開詳細地址</span>
              <span className="text-[10px] md:text-xs text-slate-500">關閉後，名片上將只顯示「主要服務地區」，保護您的隱私。</span>
            </div>
          </label>

          {/* 🌐 社群媒體連結區塊 (✅ 移出了 label 標籤) */}
          <div className="mt-6 space-y-4 border-t border-slate-800/80 pt-6">
            <h4 className="text-sm font-bold text-white mb-3">社群媒體連結</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Instagram</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/..."
                  value={editForm.instagram_url || ""}
                  onChange={(e) => onFieldChange("instagram_url", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Facebook</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/..."
                  value={editForm.facebook_url || ""}
                  onChange={(e) => onFieldChange("facebook_url", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Threads</label>
                <input
                  type="url"
                  placeholder="https://threads.net/..."
                  value={editForm.threads_url || ""}
                  onChange={(e) => onFieldChange("threads_url", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ✅ 專屬的儲存按鈕 */}
          <div className="flex justify-end mt-8 pt-5 border-t border-slate-800/80">
            <button
              onClick={onSaveGlobal}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black px-8 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 flex items-center gap-2"
            >
              {isSaving ? "儲存中..." : "儲存"}
            </button>
          </div>
          
        </div>
      )}

      {/* ── 專項名片列表區塊標題與新增按鈕 ── */}
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-800/50 mb-2">
        <h3 className="text-base md:text-lg font-black text-white">收費與專項名片</h3>
        <button onClick={onAdd} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-black px-4 py-2.5 rounded-full shadow-[0_0_15px_rgba(217,119,6,0.3)] transition-all">
          ＋ 新增專項
        </button>
      </div>

      {/* ── 專項名片列表 ── */}
      {coachProfiles.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-700/50 rounded-3xl mt-4">
          <p className="text-zinc-500 text-sm font-bold">您尚未建立任何教練名片，點擊右上方新增。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
          {coachProfiles.map(coach => (
            <div key={coach.id} className="bg-slate-900/40 border border-amber-500/20 rounded-3xl p-5 md:p-6 relative">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">指導專項</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={coach.sport} onChange={e => onUpdate(coach.id, "sport", e.target.value)}>
                    <option value="">-- 選擇專項 --</option>
                    {allSports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">時薪 (HK$)</label>
                    <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={coach.rate} placeholder="例如: 500" onChange={e => onUpdate(coach.id, "rate", e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">狀態</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={coach.status} onChange={e => onUpdate(coach.id, "status", e.target.value)}>
                      <option value="recruiting">🟢 招生中</option>
                      <option value="full">🔴 滿員</option>
                      <option value="hidden">🔒 未發布</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">指導國家</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={coach.country} onChange={e => onUpdate(coach.id, "country", e.target.value)}>
                      <option value="">國家</option>
                      {Object.keys(locationData).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">指導區域</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={coach.region} onChange={e => onUpdate(coach.id, "region", e.target.value)}>
                      <option value="">區域</option>
                      {coach.country && locationData[coach.country]?.map((r: string) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 mt-4 border-t border-slate-800">
                <button onClick={() => onSave(coach)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 md:py-3 rounded-xl text-xs md:text-sm shadow-md transition-colors">儲存 / 發布</button>
                <button onClick={() => onDelete(coach.id)} className="px-3 md:px-4 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition text-xs md:text-sm">刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
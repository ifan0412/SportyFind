"use client";

interface Sport { id: string; name: string; }
interface CoachProfile { id: string; sport: string; rate: number | string; status: string; country: string; region: string; }

interface CoachTabProps {
  coachProfiles: CoachProfile[];
  allSports: Sport[];
  locationData: Record<string, string[]>;
  onAdd: () => void;
  onUpdate: (id: string, field: keyof CoachProfile, value: any) => void;
  onSave: (coach: CoachProfile) => void;
  onDelete: (id: string) => void;
}

export function CoachTab({ coachProfiles, allSports, locationData, onAdd, onUpdate, onSave, onDelete }: CoachTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-white">教練名片設定</h2>
          <p className="text-[10px] md:text-xs text-zinc-500 mt-1">支援建立多張專項名片。</p>
        </div>
        <button onClick={onAdd} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-black px-3 py-2 md:px-4 md:py-2.5 rounded-full">＋ 新增專項</button>
      </div>
      {coachProfiles.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-700/50 rounded-3xl">
          <p className="text-zinc-500 text-sm font-bold">您尚未建立任何教練名片，點擊右上方新增。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                      {coach.country && locationData[coach.country]?.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 mt-4 border-t border-slate-800">
                <button onClick={() => onSave(coach)} className="flex-1 bg-amber-600 text-white font-black py-2.5 md:py-3 rounded-xl text-xs md:text-sm shadow-md">儲存 / 發布</button>
                <button onClick={() => onDelete(coach.id)} className="px-3 md:px-4 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition text-xs md:text-sm">刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
"use client";

import { getSportCategory } from "@/lib/sports-categories";
import { displaySportMatchesUserSport } from "@/lib/display-sports";
import { listSportMetadataEntries } from "@/lib/sport-positions";

interface Sport { id: string; name: string; }
interface UserSport { id: string; sport_id: string; metadata: { position?: string; [key: string]: any }; sports: { name: string } | null; }

interface ExpertiseTabProps {
  userSports: UserSport[];
  editFormDisplaySports: string[];
  onToggleDisplaySport: (sportName: string) => void;
  onOpenSportModal: (us?: UserSport) => void;
  onRemoveSport: (us: UserSport) => void;
  onSaveDisplaySports: () => void;
  onMoveSport: (id: string, direction: "up" | "down") => void;
}

export function ExpertiseTab({
  userSports,
  editFormDisplaySports,
  onToggleDisplaySport,
  onOpenSportModal,
  onRemoveSport,
  onSaveDisplaySports,
  onMoveSport,
}: ExpertiseTabProps) {
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex justify-between items-center mb-4 px-2">
        <div><h2 className="text-lg md:text-xl font-black text-white">登錄認證技術特長</h2></div>
        <button onClick={() => onOpenSportModal()} className="bg-slate-50 text-black text-xs font-black px-3 py-2 md:px-4 md:py-2.5 rounded-full hover:scale-105">＋ 新增</button>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] md:text-xs p-3 rounded-xl mb-4 font-bold flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <span>💡 勾選項目將顯示在名片上（最多3項）</span>
        <button onClick={onSaveDisplaySports} className="bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-2 rounded-lg w-full sm:w-auto text-xs md:text-sm">儲存設定</button>
      </div>
      {userSports.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-700/50 rounded-3xl">
          <p className="text-zinc-500 text-sm font-bold">空蕩蕩的技術清單... 立即宣告專業項目！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {userSports.map((us) => {
            const metaRows = listSportMetadataEntries(
              us.metadata as Record<string, unknown>,
              us.sports?.name
            );

            return (
            <div key={us.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-lg md:text-xl font-black text-white block">
                    {(() => {
                      const sport = getSportCategory(us.sports?.name);
                      return sport ? `${sport.emoji} ${sport.labelZh}` : us.sports?.name;
                    })()}
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950 p-1.5 md:p-2 rounded-lg border border-slate-800">
                    <input
                      type="checkbox"
                      checked={editFormDisplaySports.some((stored) =>
                        displaySportMatchesUserSport(stored, us.sports?.name)
                      )}
                      onChange={() => onToggleDisplaySport(us.sports?.name || "")}
                      className="rounded"
                    />
                    <span className="text-[10px] text-zinc-400 font-bold whitespace-nowrap">顯示於名片</span>
                  </label>
                </div>
                <div className="space-y-2">
                  {metaRows.map(({ key, label, value }) => (
                    <div key={key} className="flex justify-between gap-4 text-xs md:text-sm pb-1 border-b border-slate-800/50 last:border-0">
                      <span className="text-zinc-500 font-bold shrink-0">{label}</span>
                      {Array.isArray(value) ? (
                        <span className="text-blue-400 font-black text-right flex flex-col gap-1 items-end">
                          {value.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-blue-400 font-black text-right">{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end gap-2">
                <button onClick={() => onMoveSport(us.id, "up")} className="text-zinc-300 text-xs font-bold px-3 py-1.5 bg-slate-800 rounded-xl">↑ 上移</button>
                <button onClick={() => onMoveSport(us.id, "down")} className="text-zinc-300 text-xs font-bold px-3 py-1.5 bg-slate-800 rounded-xl">↓ 下移</button>
                <button onClick={() => onOpenSportModal(us)} className="text-blue-400 text-xs font-bold px-3 py-1.5 bg-blue-500/10 rounded-xl">✏️ 編輯</button>
                <button onClick={() => onRemoveSport(us)} className="text-red-400 text-xs font-bold px-3 py-1.5 bg-red-500/10 rounded-xl">🗑️ 移除</button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

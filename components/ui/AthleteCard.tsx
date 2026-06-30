"use client";

export const AthleteCard = ({ card, onClick }: { card: any; onClick: () => void }) => {
  const pos = card.user_sports?.[0]?.metadata?.position;
  
  const renderBadge = (tag: string) => {
    if (tag === "open_to_team") return <span className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-full font-black">🟢 尋找球隊</span>;
    if (tag === "looking_for_sub") return <span className="bg-amber-500/10 text-amber-400 text-xs px-3 py-1 rounded-full font-black">🟡 可替補</span>;
    return <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-full font-bold">⚪ 訓練中</span>;
  };

  return (
    <div 
      onClick={onClick} 
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-3xl p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-950 flex flex-col justify-between cursor-pointer group"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div 
            className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 bg-cover bg-center shrink-0 flex items-center justify-center text-xl font-black text-slate-600"
            style={{ backgroundImage: card.avatar_url ? `url(${card.avatar_url})` : 'none' }}
          >
            {!card.avatar_url && (card.full_name?.[0] || "PRO")}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {card.is_coach && <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded">🏆 教練</span>}
            {renderBadge(card.status_tag)}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition">{card.full_name}</h3>
          <p className="text-xs font-bold text-blue-400 mt-0.5 line-clamp-1">{card.headline}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {card.user_sports?.map((us: any, i: number) => (
            <span key={i} className="bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-black px-2.5 py-1 rounded-lg">🏅 {us.sports?.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
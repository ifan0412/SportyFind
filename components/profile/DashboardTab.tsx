"use client";

interface DashboardTabProps {
  profile: { full_name: string | null } | null;
  avatarSrc: string;
}

export function DashboardTab({ profile, avatarSrc }: DashboardTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="relative group">
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] z-10 rounded-3xl flex items-center justify-center opacity-100 transition-opacity">
          <div className="bg-slate-900 border border-slate-700 text-white text-sm font-black px-6 py-2 rounded-full shadow-2xl flex items-center gap-2">
            <span>🚀</span> Coming Soon
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-30 select-none pointer-events-none blur-[1px]">
          <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl flex flex-col justify-center"><span className="text-zinc-500 text-[10px] font-black tracking-widest mb-1">Total Views</span><span className="text-3xl font-black text-white">--</span></div>
          <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl flex flex-col justify-center"><span className="text-zinc-500 text-[10px] font-black tracking-widest mb-1">Scout Search</span><span className="text-3xl font-black text-blue-400">--</span></div>
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-500/20 p-5 rounded-3xl flex items-center justify-between">
            <div><span className="text-indigo-400 text-[10px] font-black tracking-widest block mb-1">Rankings</span><span className="text-xl font-black text-white">即將解鎖</span></div>
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-xl">🔥</div>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🏆</div>
        <h3 className="text-white font-bold mb-2">準備好參加賽事了嗎？</h3>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">完善你的「技術特長」與「賽事影音」，系統將為您智慧推播最合適的職缺。</p>
      </div>
    </div>
  );
}
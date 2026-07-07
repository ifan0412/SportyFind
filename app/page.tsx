import React from "react";
import Link from "next/link";
import { Users, Shield, GraduationCap, Activity, Trophy, ArrowRight } from "lucide-react";
import { SportsTipsHomeBlock } from "@/components/home/SportsTipsHomeBlock";

export default function HomePage() {
  const pillars = [
    {
      href: "/network",
      title: "運動夥伴",
      subtitle: "探索球員",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgHover: "hover:bg-blue-600/5",
      borderColor: "group-hover:border-blue-500/30",
    },
    {
      href: "/team",
      title: "競技隊伍",
      subtitle: "探索隊伍",
      icon: Shield,
      color: "from-indigo-500 to-indigo-600",
      bgHover: "hover:bg-indigo-600/5",
      borderColor: "group-hover:border-indigo-500/30",
    },
    {
      href: "/coaches",
      title: "專業教練",
      subtitle: "探索教練",
      icon: GraduationCap,
      color: "from-amber-500 to-amber-600",
      bgHover: "hover:bg-amber-600/5",
      borderColor: "group-hover:border-amber-500/30",
    },
    {
      href: "/physio",
      title: "運動復健",
      subtitle: "探索復健",
      icon: Activity,
      color: "from-emerald-500 to-emerald-600",
      bgHover: "hover:bg-emerald-600/5",
      borderColor: "group-hover:border-emerald-500/30",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-center relative overflow-hidden">
      
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center mt-6">
        
        <span className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-blue-400 rounded-full mb-6 shadow-sm">
          測試版 v1.0 · 搶先體驗
        </span>
        
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">
          SPORTY<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">FIND</span>
        </h1>
        
        <div className="mb-10 space-y-2">
          <p className="text-xl md:text-2xl text-slate-100 font-extrabold tracking-wide">
            一站式運動社群網絡
          </p>
          <p className="text-sm md:text-base text-slate-400 font-medium">
            配對、組隊、約戰、訓練與復健，一站完成
          </p>
        </div>

        <div className="w-full max-w-4xl px-2 mb-16 space-y-4">
          
          <Link
            href="/events"
            className="group relative w-full flex flex-col md:flex-row items-center justify-between p-6 md:px-8 md:py-7 bg-gradient-to-r from-orange-600/20 via-amber-600/10 to-slate-900/80 backdrop-blur-md border border-orange-500/30 hover:border-orange-500/60 rounded-3xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-500/10 overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-5 text-center md:text-left z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                <Trophy className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    約戰賽事大廳
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-black bg-orange-500 text-slate-950 rounded-md uppercase tracking-wider">
                    熱門
                  </span>
                </div>
                <p className="text-xs md:text-sm font-medium text-slate-300">
                  報名與組隊友誼對抗 · 發起專屬運動賽事
                </p>
              </div>
            </div>

            <div className="mt-4 md:mt-0 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-400 group-hover:text-orange-300 transition-colors z-10">
              <span>探索賽事</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pillars.map((pillar) => (
              <Link 
                key={pillar.title}
                href={pillar.href}
                className={`group flex flex-col items-center justify-center p-6 md:p-7 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl transition-all duration-500 ${pillar.bgHover} ${pillar.borderColor} hover:-translate-y-1 hover:shadow-2xl`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-white shadow-lg bg-gradient-to-br ${pillar.color} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                  <pillar.icon className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <h3 className="text-base font-black text-white mb-1 tracking-wide">
                  {pillar.title}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
                  {pillar.subtitle}
                </p>
              </Link>
            ))}
          </div>

          <SportsTipsHomeBlock />

        </div>

        <div className="w-full max-w-2xl border-t border-slate-800/60 pt-10 mt-6">
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-10 text-xs font-black tracking-[0.15em] uppercase text-slate-600">
            <span className="flex items-center gap-2 hover:text-slate-400 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span> 連結
            </span>
            <span className="flex items-center gap-2 hover:text-slate-400 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span> 訓練
            </span>
            <span className="flex items-center gap-2 hover:text-slate-400 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></span> 競賽
            </span>
            <span className="flex items-center gap-2 hover:text-slate-400 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span> 復健
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

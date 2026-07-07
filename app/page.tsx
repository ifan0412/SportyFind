import React from "react";
import Link from "next/link";
import {
  Users,
  Shield,
  GraduationCap,
  Activity,
  Trophy,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { CATEGORY_COLORS, type SiteCategory } from "@/lib/category-colors";

type HomeBlock = {
  category: SiteCategory;
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  badge?: { label: string; className: string };
};

export default function HomePage() {
  const blocks: HomeBlock[] = [
    {
      category: "events",
      href: "/events",
      title: "約戰賽事",
      subtitle: "報名友誼對抗 · 發起賽事",
      icon: Trophy,
      badge: { label: "熱門", className: CATEGORY_COLORS.events.badge },
    },
    {
      category: "network",
      href: "/network",
      title: "運動夥伴",
      subtitle: "探索夥伴",
      icon: Users,
    },
    {
      category: "team",
      href: "/team",
      title: "競技隊伍",
      subtitle: "探索隊伍",
      icon: Shield,
    },
    {
      category: "coaches",
      href: "/coaches",
      title: "專業教練",
      subtitle: "探索教練",
      icon: GraduationCap,
    },
    {
      category: "physio",
      href: "/physio",
      title: "運動復健",
      subtitle: "探索復健",
      icon: Activity,
    },
    {
      category: "content",
      href: "/content",
      title: "運動貼士",
      subtitle: "訓練、營養與復康指南",
      icon: Sparkles,
      badge: { label: "新上線", className: CATEGORY_COLORS.content.badge },
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
           全方位運動社群網絡
          </p>
          <p className="text-sm md:text-base text-slate-400 font-medium">
            配對 ・ 組隊 ・ 約戰 ・ 訓練
          </p>
        </div>

        <div className="w-full max-w-5xl px-2 mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {blocks.map((block) => {
              const colors = CATEGORY_COLORS[block.category];
              return (
                <Link
                  key={block.href}
                  href={block.href}
                  className={`group relative flex flex-col items-center justify-center aspect-[5/4] p-5 sm:p-6 md:p-7 bg-gradient-to-br ${colors.cardGradient} backdrop-blur-md border ${colors.border} ${colors.borderHover} ${colors.bgHover} ${colors.glow} rounded-3xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl text-center overflow-hidden`}
                >
                  {block.badge && (
                    <span
                      className={`absolute top-3 right-3 z-10 px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${block.badge.className}`}
                    >
                      {block.badge.label}
                    </span>
                  )}
                  <div className="flex flex-col items-center justify-center w-full text-center">
                    <div
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-3 md:mb-4 text-white shadow-lg bg-gradient-to-br ${colors.iconGradient} ${colors.shadow} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}
                    >
                      <block.icon className="w-7 h-7 md:w-8 md:h-8" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight mb-1 px-2">
                      {block.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors px-2 line-clamp-2 w-full text-center">
                      {block.subtitle}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-2xl border-t border-slate-800/60 pt-10 mt-6">
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-10 text-xs font-black tracking-[0.15em] uppercase text-slate-600">
            {(
              [
                ["network", "連結"],
                ["team", "組隊"],
                ["events", "約戰"],
                ["coaches", "訓練"],
                ["physio", "復健"],
                ["content", "貼士"],
              ] as const
            ).map(([cat, label]) => (
              <span
                key={cat}
                className="flex items-center gap-2 hover:text-slate-400 transition-colors cursor-default"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[cat].dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

import React from "react";
import Link from "next/link";
import { Users, Shield, GraduationCap, Activity } from "lucide-react";
import CommunityFeed from "@/components/CommunityFeed";

export default function HomePage() {
  const pillars = [
    {
      href: "/network",
      title: "運動夥伴",
      subtitle: "Find Athletes",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgHover: "hover:bg-blue-600/5",
      borderColor: "group-hover:border-blue-500/30",
    },
    {
      href: "/team",
      title: "競技隊伍",
      subtitle: "Find Teams",
      icon: Shield,
      color: "from-indigo-500 to-indigo-600",
      bgHover: "hover:bg-indigo-600/5",
      borderColor: "group-hover:border-indigo-500/30",
    },
    {
      href: "/coaches",
      title: "專業教練",
      subtitle: "Find Coaches",
      icon: GraduationCap,
      color: "from-amber-500 to-amber-600",
      bgHover: "hover:bg-amber-600/5",
      borderColor: "group-hover:border-amber-500/30",
    },
    {
      href: "/physio",
      title: "運動復健",
      subtitle: "Find Physios",
      icon: Activity,
      color: "from-emerald-500 to-emerald-600",
      bgHover: "hover:bg-emerald-600/5",
      borderColor: "group-hover:border-emerald-500/30",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-center relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center mt-8">
        
        {/* Top badge */}
        <span className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-blue-400 rounded-full mb-8 shadow-sm">
          Alpha v1.0 · Early Access
        </span>
        
        {/* Main title */}
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">
          SPORTY<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">FIND</span>
        </h1>
        
        {/* Tagline */}
        <div className="mb-14 space-y-3">
          <p className="text-xl md:text-2xl text-slate-200 font-bold tracking-wide">
            專為全運動領域打造的數位平台
          </p>
          <p className="text-sm md:text-base text-slate-500 font-medium">
            A comprehensive ecosystem built for all sports disciplines.
          </p>
        </div>

        {/* 4 Pillars Grid (CTA) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl px-2 mb-16">
          {pillars.map((pillar) => (
            <Link 
              key={pillar.title}
              href={pillar.href}
              className={`group flex flex-col items-center justify-center p-6 md:p-8 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl transition-all duration-500 ${pillar.bgHover} ${pillar.borderColor} hover:-translate-y-1 hover:shadow-2xl`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg bg-gradient-to-br ${pillar.color} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                <pillar.icon className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <h3 className="text-base md:text-lg font-black text-white mb-1 tracking-wide">
                {pillar.title}
              </h3>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
                {pillar.subtitle}
              </p>
            </Link>
          ))}
        </div>

        {/* 動態牆區域 (Hybrid Dashboard) */}
        <div className="w-full mt-8 md:mt-12">
          <CommunityFeed />
        </div>

        {/* Elegant Manifesto / Core Values replacing the meaningless stats */}
        <div className="w-full max-w-2xl border-t border-slate-800/60 pt-10 mt-4">
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-10 text-xs font-black tracking-[0.15em] uppercase text-slate-600">
            <span className="flex items-center gap-2 hover:text-slate-400 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span> Connect
            </span>
            <span className="flex items-center gap-2 hover:text-slate-400 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span> Train
            </span>
            <span className="flex items-center gap-2 hover:text-slate-400 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></span> Compete
            </span>
            <span className="flex items-center gap-2 hover:text-slate-400 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span> Recover
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-center relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
        
        {/* Top badge */}
        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-900 border border-slate-700 text-blue-400 rounded-full mb-6 shadow-sm">
          Alpha v1.0 · Early Access
        </span>
        
        {/* Main title */}
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">
          SPORTY<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">FIND</span>
        </h1>
        
        {/* Tagline */}
        <div className="mb-10 space-y-2">
          <p className="text-lg md:text-xl text-slate-300 font-medium">
            連結運動員與教練的專業社群平台。
          </p>
          <p className="text-sm md:text-base text-slate-500">
            The professional network built for athletes and coaches.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/network/"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <span className="text-sm">尋找球友</span>
            <span className="text-[10px] text-blue-100">Find Players →</span>
          </Link>
          
          <Link 
            href="/coaches"
            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold border border-slate-700 rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <span className="text-sm">認識教練</span>
            <span className="text-[10px] text-slate-400">Browse Coaches</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 pt-8 border-t border-slate-800/80 flex items-center justify-center gap-8 md:gap-16 text-left">
          <div>
            <div className="text-2xl font-black text-white">50+</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-relaxed">
              運動項目<br/>
              <span className="text-slate-500 normal-case font-normal">Sports covered</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">100%</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-relaxed">
              實名認證<br/>
              <span className="text-slate-500 normal-case font-normal">Real profiles only</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">0</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-relaxed">
              廣告干擾<br/>
              <span className="text-slate-500 normal-case font-normal">Zero ads, ever</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-pro-slate-950 flex flex-col items-center justify-center p-4 font-sans text-center relative overflow-hidden">
      
      {/* 科技感背景光暈裝飾 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pro-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
        
        {/* 頂部小標籤 */}
        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-pro-slate-900 border border-pro-slate-700 text-blue-400 rounded-full mb-6 shadow-sm">
          Platform Alpha v1.0
        </span>
        
        {/* 雙語主標題 */}
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">
          PRO SPORTS <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
            NETWORK
          </span>
        </h1>
        
        <div className="mb-10 space-y-2">
          <p className="text-lg md:text-xl text-slate-300 font-medium">
            全港首創，專為運動員與教練打造的專業社群。
          </p>
          <p className="text-sm md:text-base text-slate-500">
            The first professional social network built exclusively for athletes and coaches in Hong Kong.
          </p>
        </div>

        {/* 雙語行動呼籲按鈕 (CTA) */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/network/players"
            className="px-8 py-4 bg-pro-blue-600 hover:bg-pro-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <span className="text-sm">尋找球友</span>
            <span className="text-[10px] text-blue-100">Find Players →</span>
          </Link>
          
          <Link 
            href="/coaches"
            className="px-8 py-4 bg-pro-slate-900 hover:bg-pro-slate-800 text-white font-bold border border-pro-slate-700 rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-0.5 active:scale-95"
          >
            <span className="text-sm">星級教練榜</span>
            <span className="text-[10px] text-slate-400">Verified Coaches</span>
          </Link>
        </div>

        {/* 底部數據信任背書 */}
        <div className="mt-16 pt-8 border-t border-pro-slate-800/80 flex items-center justify-center gap-8 md:gap-16 text-left">
          <div>
            <div className="text-2xl font-black text-white">50+</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">運動項目<br/>Sports</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">100%</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">實名認證<br/>Verified</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">0</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">廣告干擾<br/>Ads Free</div>
          </div>
        </div>

      </div>
    </div>
  );
}
"use client";

import React, { useState } from "react";

export default function CommunityFeed() {
  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <section className="w-full max-w-3xl mx-auto px-4 pb-20 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-wide">生態圈動態</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Community Activity</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1">
          {["all", "找夥伴", "教練專欄", "招募中"].map((filter, idx) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(idx === 0 ? "all" : filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                (activeFilter === "all" && idx === 0) || activeFilter === filter
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {idx === 0 ? "全部動態" : filter}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
        <p className="text-4xl mb-4">📭</p>
        <h3 className="text-lg font-bold text-slate-300">暫無動態</h3>
        <p className="text-sm text-slate-500 mt-2">社群動態功能即將上線。</p>
      </div>
    </section>
  );
}

"use client";

import React, { useState } from "react";
import { MessageSquare, Heart, Share2, MoreHorizontal, CheckCircle2 } from "lucide-react";

// Placeholder feed — real posts come from Supabase when the feed ships.
const MOCK_POSTS: never[] = [];

export default function CommunityFeed() {
  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <section className="w-full max-w-3xl mx-auto px-4 pb-20 animate-fadeIn">
      
      {/* 動態牆標題與過濾器 */}
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

      {/* 動態貼文列表 */}
      <div className="space-y-6">
        {MOCK_POSTS.map((post) => (
          <article key={post.id} className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-3xl p-5 md:p-6 transition-colors hover:bg-slate-900/60">
            
            {/* 作者資訊區塊 */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-sm font-black text-white shadow-inner">
                  {post.author.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-white">{post.author.name}</h3>
                    {post.author.isPro && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                    <span className="text-blue-400/80">{post.author.handle}</span>
                    <span>•</span>
                    <span>{post.role}</span>
                    <span>•</span>
                    <span>{post.time}</span>
                  </div>
                </div>
              </div>
              <button className="text-slate-500 hover:text-white transition-colors p-1">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* 貼文內容 */}
            <div className="mb-4">
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                {post.content}
              </p>
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                {post.tags.map(tag => (
                  <span key={tag} className="text-xs font-bold text-blue-400 cursor-pointer hover:text-blue-300 transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 互動按鈕 */}
            <div className="flex items-center gap-6 border-t border-slate-800/50 pt-4 mt-2">
              <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-400 transition-colors group">
                <Heart className="w-4 h-4 group-hover:fill-red-400/20" /> {post.likes}
              </button>
              <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors group">
                <MessageSquare className="w-4 h-4 group-hover:fill-blue-400/20" /> {post.comments}
              </button>
              <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-400 transition-colors ml-auto">
                <Share2 className="w-4 h-4" />
              </button>
            </div>

          </article>
        ))}
      </div>
    </section>
  );
}
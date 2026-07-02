"use client";

import React, { useState } from "react";
import { MessageSquare, Heart, Share2, MoreHorizontal, CheckCircle2 } from "lucide-react";

// 模擬的動態資料 (之後可串接 Supabase)
const MOCK_POSTS = [
  {
    id: 1,
    author: { name: "Jason Lee", handle: "@jason_runner", avatar: "J", isPro: false },
    role: "Marathon Runner",
    time: "2 小時前",
    content: "剛完成這個月的 100K 跑量！準備進入下一個階段的間歇訓練。有人週末想一起在科學園練跑嗎？🏃‍♂️💨",
    tags: ["#徵跑友", "#馬拉松訓練"],
    likes: 24,
    comments: 5,
  },
  {
    id: 2,
    author: { name: "Coach Sarah", handle: "@sarah_strength", avatar: "S", isPro: true },
    role: "Strength & Conditioning Coach",
    time: "5 小時前",
    content: "很多運動員忽略了單側發力 (Unilateral training) 的重要性。這不僅能改善左右肌力不平衡，還能大幅降低受傷風險。下週我會釋出三個必做的單側訓練動作，敬請期待！🏋️‍♀️",
    tags: ["#教練專欄", "#肌力訓練", "#預防受傷"],
    likes: 156,
    comments: 12,
  },
  {
    id: 3,
    author: { name: "Kowloon Hoops", handle: "@kln_hoops", avatar: "K", isPro: false },
    role: "Amateur Basketball Team",
    time: "昨天",
    content: "🏀 招募新血！我們是一支位於九龍區的業餘籃球隊，目前正在尋找有經驗的控球後衛 (PG) 補強陣容。每週三晚上固定練球，有意願的兄弟請私訊或留言！",
    tags: ["#球員招募", "#籃球"],
    likes: 45,
    comments: 8,
  }
];

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
"use client";

import { useRef } from "react";

interface MediaItem { id: string; sportName: string; type: "image" | "video"; url: string; fileName?: string; createdAt: string; }
interface UserSport { id: string; sport_id: string; metadata: any; sports: { name: string } | null; }

interface HighlightsTabProps {
  galleryMedia: MediaItem[];
  userSports: UserSport[];
  onSelectPost: (post: MediaItem) => void;
  onOpenMediaModal: () => void;
}

export function HighlightsTab({ galleryMedia, userSports, onSelectPost, onOpenMediaModal }: HighlightsTabProps) {
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-wrap justify-between items-center mb-4 px-2 gap-2">
        <div><h2 className="text-lg md:text-xl font-black text-white">賽場高清圖庫</h2></div>
        {userSports.length > 0
          ? <button onClick={onOpenMediaModal} className="bg-slate-50 text-black text-xs font-black px-3 py-2 md:px-4 md:py-2.5 rounded-full">📸 上傳高光</button>
          : <p className="text-[10px] md:text-xs text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded-lg">先宣告特長</p>
        }
      </div>
      <div className="grid grid-cols-3 gap-1 md:gap-2">
        {galleryMedia.map(m => (
          <div key={m.id} onClick={() => onSelectPost(m)} className="relative group aspect-square overflow-hidden bg-slate-900 cursor-pointer">
            <img src={m.url} alt={m.sportName} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
          </div>
        ))}
      </div>
    </div>
  );
}
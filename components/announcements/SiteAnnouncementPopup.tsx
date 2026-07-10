"use client";

import Image from "next/image";
import { X } from "lucide-react";
import type { SitePopupAnnouncement } from "@/lib/announcements/types";
import { cn } from "@/lib/utils";

interface SiteAnnouncementPopupProps {
  announcement: SitePopupAnnouncement;
  onClose: () => void;
  preview?: boolean;
}

export function SiteAnnouncementPopup({
  announcement,
  onClose,
  preview = false,
}: SiteAnnouncementPopupProps) {
  const isText = announcement.content_type === "text";
  const isImage = announcement.content_type === "image";

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={announcement.title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="關閉彈窗"
      />

      <div
        className={cn(
          "relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden",
          isImage && "max-w-3xl bg-transparent border-0 shadow-none"
        )}
      >
        {preview && (
          <div className="absolute -top-10 left-0 right-0 text-center">
            <span className="inline-flex px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              預覽模式
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition",
            isImage
              ? "bg-black/50 hover:bg-black/70 text-white border border-white/20"
              : "bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white border border-slate-600"
          )}
          aria-label="關閉"
        >
          <X className="w-4 h-4" />
        </button>

        {isText && (
          <div className="p-6 sm:p-8 pr-14">
            <p className="text-sm sm:text-base text-zinc-100 leading-relaxed whitespace-pre-wrap">
              {announcement.text_content?.trim() || "（尚無文字內容）"}
            </p>
          </div>
        )}

        {isImage && (
          <div className="relative w-full">
            {announcement.image_desktop_url ? (
              <div className="relative hidden md:block w-full aspect-[16/10] max-h-[80vh]">
                <Image
                  src={announcement.image_desktop_url}
                  alt={announcement.title}
                  fill
                  className="object-contain rounded-2xl"
                  sizes="(min-width: 768px) 768px, 100vw"
                  unoptimized
                />
              </div>
            ) : (
              <div className="hidden md:flex h-48 items-center justify-center rounded-2xl bg-slate-800 text-zinc-500 text-sm">
                尚未上傳桌面版圖片
              </div>
            )}

            {announcement.image_mobile_url ? (
              <div className="relative md:hidden w-full aspect-[3/4] max-h-[80vh]">
                <Image
                  src={announcement.image_mobile_url}
                  alt={announcement.title}
                  fill
                  className="object-contain rounded-2xl"
                  sizes="100vw"
                  unoptimized
                />
              </div>
            ) : (
              <div className="md:hidden flex h-64 items-center justify-center rounded-2xl bg-slate-800 text-zinc-500 text-sm">
                尚未上傳手機版圖片
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

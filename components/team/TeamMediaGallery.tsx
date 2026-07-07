"use client";

import { useState } from "react";
import Image from "next/image";

interface TeamMediaGalleryProps {
  photos: string[];
  emptyLabel?: string;
  onPhotoClick?: (url: string, index: number) => void;
}

export function TeamMediaGallery({
  photos,
  emptyLabel = "尚無相片",
  onPhotoClick,
}: TeamMediaGalleryProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (photos.length === 0) {
    return (
      <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-sm font-bold">
        {emptyLabel}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((url, idx) => (
          <button
            key={`${url}-${idx}`}
            type="button"
            onClick={() => {
              onPhotoClick?.(url, idx);
              setLightbox(url);
            }}
            className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition group"
          >
            <Image src={url} alt={`Team photo ${idx + 1}`} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-3xl font-black z-10"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Team photo"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

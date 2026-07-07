"use client";

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { BannerDevicePreview } from "@/components/media/BannerDevicePreview";
import type { BannerPreviewLayout } from "@/lib/banner-display";
import { cropImageToFile, getCroppedImg } from "@/lib/image-crop";

export type ImageCropPreset =
  | "avatar"
  | "logo"
  | "banner"
  | "team-cover"
  | "hero-cover"
  | "square";

type PresetConfig = {
  aspect: number;
  cropShape: "round" | "rect";
  title: string;
  hint: string;
  maxDim?: number;
  devicePreview?: BannerPreviewLayout;
};

const PRESET_CONFIG: Record<ImageCropPreset, PresetConfig> = {
  avatar: {
    aspect: 1,
    cropShape: "round",
    title: "調整個人頭像",
    hint: "拖曳與縮放以對準頭像，確認後才會更新。",
  },
  logo: {
    aspect: 1,
    cropShape: "rect",
    title: "調整團隊 Logo",
    hint: "建議 1:1 正方形，拖曳與縮放後確認。",
  },
  banner: {
    aspect: 16 / 9,
    cropShape: "rect",
    title: "調整相片",
    hint: "16:9 橫圖，拖曳與縮放後確認。",
  },
  "team-cover": {
    aspect: 16 / 9,
    cropShape: "rect",
    title: "調整團隊封面橫幅",
    hint: "建議 16:9 橫圖。下方可即時預覽手機與桌面（16:9）顯示效果。",
    maxDim: 1920,
    devicePreview: "team",
  },
  "hero-cover": {
    aspect: 16 / 9,
    cropShape: "rect",
    title: "調整文章封面",
    hint: "拖曳與縮放對準畫面重點。下方可即時預覽手機與桌面顯示效果。",
    maxDim: 1920,
    devicePreview: "hero",
  },
  square: {
    aspect: 1,
    cropShape: "rect",
    title: "調整相片",
    hint: "拖曳與縮放以裁切，確認後才會上傳。",
  },
};

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string | null;
  preset?: ImageCropPreset;
  filename?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

export function ImageCropModal({
  open,
  imageSrc,
  preset = "square",
  filename = "cropped.jpg",
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const config = PRESET_CONFIG[preset];
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPreviewUrl(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open || !imageSrc || !croppedAreaPixels || !config.devicePreview) return;

    let cancelled = false;
    void getCroppedImg(imageSrc, croppedAreaPixels).then((blob) => {
      if (cancelled || !blob) return;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [open, imageSrc, croppedAreaPixels, config.devicePreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  if (!open || !imageSrc) return null;

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const file = await cropImageToFile(
        imageSrc,
        croppedAreaPixels,
        filename,
        config.maxDim ?? 1200
      );
      if (file) onConfirm(file);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/95 p-0 sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-950 sm:bg-transparent sm:max-h-[96dvh]">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur sm:border-0 sm:bg-transparent sm:px-1 sm:py-0 sm:static">
          <h3 className="text-lg font-black text-white">{config.title}</h3>
          <p className="mt-1 text-xs text-zinc-400">{config.hint}</p>
        </div>

        <div className="space-y-4 px-4 pb-4 sm:px-1 sm:pb-0">
          <div className="relative h-[min(40vh,360px)] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-2xl sm:rounded-3xl">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={config.aspect}
              cropShape={config.cropShape}
              showGrid
              onCropChange={setCrop}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              onZoomChange={setZoom}
            />
            {config.devicePreview === "team" && <TeamCropGuides />}
          </div>

          <div>
            <label className="pl-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              縮放 Zoom
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-2 w-full touch-manipulation accent-blue-500"
            />
          </div>

          {config.devicePreview && (
            <BannerDevicePreview previewUrl={previewUrl} layout={config.devicePreview} />
          )}

          <div className="flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 rounded-xl bg-slate-800 py-3 font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing || !croppedAreaPixels}
              className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {isProcessing ? "處理中..." : "確認裁切"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mobile banner is shorter than 16:9 — show safe band on crop frame. */
function TeamCropGuides() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        className="absolute inset-x-[6%] border-y-2 border-dashed border-sky-400/70"
        style={{ top: "22%", bottom: "22%" }}
      />
      <div className="absolute left-2 top-1 rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-300">
        手機可見區
      </div>
    </div>
  );
}

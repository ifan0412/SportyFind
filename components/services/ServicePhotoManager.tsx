"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, UploadCloud, Loader2, Globe } from "lucide-react";
import { ImageCropModal } from "@/components/media/ImageCropModal";
import { readFileAsDataUrl } from "@/lib/image-crop";
import {
  normalizeServicePhotos,
  type ServicePhotoEntry,
} from "@/lib/service-photos";

interface ServicePhotoManagerProps {
  photos: string[];
  draftPhotos: string[];
  uploading?: boolean;
  accent?: "orange" | "green" | "amber" | "emerald";
  emptyLabel?: string;
  onUpload: (files: FileList | null) => void | Promise<void>;
  onPublish: (url: string) => void | Promise<void>;
  onDelete: (url: string, status: ServicePhotoEntry["status"]) => void | Promise<void>;
}

export function ServicePhotoManager({
  photos,
  draftPhotos,
  uploading = false,
  accent = "amber",
  emptyLabel = "尚無相片，請點擊上方按鈕開始上傳。",
  onUpload,
  onPublish,
  onDelete,
}: ServicePhotoManagerProps) {
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const entries = normalizeServicePhotos(photos, draftPhotos);
  const resolvedAccent = accent === "amber" ? "orange" : accent === "emerald" ? "green" : accent;
  const uploadBtn =
    resolvedAccent === "orange"
      ? "bg-orange-600 hover:bg-orange-500"
      : "bg-green-700 hover:bg-green-600";
  const publishBtn =
    resolvedAccent === "orange"
      ? "bg-orange-600/90 hover:bg-orange-500"
      : "bg-green-600/90 hover:bg-green-500";

  const handleDelete = (entry: ServicePhotoEntry) => {
    const label = entry.status === "draft" ? "確定要刪除此草稿相片嗎？" : "確定要刪除此已發佈相片嗎？此動作無法復原。";
    if (!window.confirm(label)) return;
    void onDelete(entry.url, entry.status);
  };

  const startCropQueue = async (files: FileList | null) => {
    if (!files?.length) return;
    const queue = Array.from(files);
    setCropQueue(queue);
    setCropImageSrc(await readFileAsDataUrl(queue[0]));
  };

  const closeCropModal = () => {
    setCropQueue([]);
    setCropImageSrc(null);
  };

  const handleCropConfirm = async (file: File) => {
    const dt = new DataTransfer();
    dt.items.add(file);
    await onUpload(dt.files);

    const rest = cropQueue.slice(1);
    if (rest.length > 0) {
      setCropQueue(rest);
      setCropImageSrc(await readFileAsDataUrl(rest[0]));
    } else {
      closeCropModal();
    }
  };

  return (
    <>
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-400 font-bold">
          上傳後為草稿，按「發佈」才會顯示於公開頁面
        </span>
        <label
          className={`${uploadBtn} text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 transition shrink-0`}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
          {uploading ? "上傳中..." : "＋ 選擇相片上傳"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              void startCropQueue(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
        </label>
      </div>

      {entries.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {entries.map((entry) => (
            <div
              key={`${entry.status}-${entry.url}`}
              className={`relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border group ${
                entry.status === "draft" ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-slate-800"
              }`}
            >
              <Image src={entry.url} alt="Service photo" fill className="object-cover" />
              <div className="absolute top-2 left-2">
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    entry.status === "draft"
                      ? "bg-amber-950/90 text-amber-300 border-amber-500/40"
                      : "bg-emerald-950/90 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {entry.status === "draft" ? "草稿" : "已發佈"}
                </span>
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {entry.status === "draft" && (
                  <button
                    type="button"
                    onClick={() => void onPublish(entry.url)}
                    className={`${publishBtn} text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg flex items-center gap-1 transition cursor-pointer`}
                    title="發佈相片"
                  >
                    <Globe className="w-3 h-3" />
                    發佈
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(entry)}
                  className="p-1.5 rounded-lg bg-slate-950/85 border border-slate-700 text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition cursor-pointer"
                  title="刪除相片"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
          {emptyLabel}
        </div>
      )}
    </div>

    <ImageCropModal
      open={cropImageSrc !== null}
      imageSrc={cropImageSrc}
      preset="banner"
      filename="service-photo.jpg"
      onCancel={closeCropModal}
      onConfirm={handleCropConfirm}
    />
  </>
  );
}

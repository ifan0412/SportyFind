"use client";

import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ImageCropModal } from "@/components/media/ImageCropModal";
import { readFileAsDataUrl } from "@/lib/image-crop";
import { useActionLock } from "@/lib/use-submit-once";
import { TeamMediaGallery } from "@/components/team/TeamMediaGallery";

type CropTarget = "logo" | "cover" | "gallery" | null;

interface TeamMediaManagerProps {
  teamId: string;
  userId: string;
  logoUrl: string | null;
  coverUrl: string | null;
  galleryPhotos: string[];
  onUpdated: () => void;
}

export function TeamMediaManager({
  teamId,
  userId,
  logoUrl,
  coverUrl,
  galleryPhotos,
  onUpdated,
}: TeamMediaManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(coverUrl);
  const [photos, setPhotos] = useState<string[]>(galleryPhotos);
  const [pendingGalleryFiles, setPendingGalleryFiles] = useState<File[]>([]);

  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [galleryCropQueue, setGalleryCropQueue] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useActionLock();

  useEffect(() => {
    setLogoPreview(logoUrl);
    setCoverPreview(coverUrl);
    setPhotos(galleryPhotos);
    setLogoFile(null);
    setCoverFile(null);
    setPendingGalleryFiles([]);
  }, [logoUrl, coverUrl, galleryPhotos]);

  const hasChanges =
    !!logoFile ||
    !!coverFile ||
    pendingGalleryFiles.length > 0 ||
    JSON.stringify(photos) !== JSON.stringify(galleryPhotos);

  const openCrop = async (file: File, target: CropTarget) => {
    setCropImageSrc(await readFileAsDataUrl(file));
    setCropTarget(target);
  };

  const closeCropModal = () => {
    setCropTarget(null);
    setCropImageSrc(null);
    setGalleryCropQueue([]);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await openCrop(file, type);
  };

  const startGalleryCrop = async (files: FileList | null) => {
    if (!files?.length) return;
    const queue = Array.from(files);
    setGalleryCropQueue(queue);
    await openCrop(queue[0], "gallery");
  };

  const handleCropConfirm = async (file: File) => {
    if (cropTarget === "logo") {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      closeCropModal();
      return;
    }
    if (cropTarget === "cover") {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      closeCropModal();
      return;
    }
    if (cropTarget === "gallery") {
      setPendingGalleryFiles((prev) => [...prev, file]);
      const rest = galleryCropQueue.slice(1);
      if (rest.length > 0) {
        setGalleryCropQueue(rest);
        setCropImageSrc(await readFileAsDataUrl(rest[0]));
      } else {
        closeCropModal();
      }
    }
  };

  const removePendingPhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${teamId}/${userId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("team-assets").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("team-assets").getPublicUrl(path).data.publicUrl;
  };

  const handleSave = async () => {
    if (!saveLock.tryLock()) return;
    setIsSaving(true);
    try {
      let finalLogo = logoUrl;
      let finalCover = coverUrl;
      const finalGallery = [...photos];

      if (logoFile) finalLogo = await uploadFile(logoFile, "logos");
      if (coverFile) finalCover = await uploadFile(coverFile, "covers");

      for (const file of pendingGalleryFiles) {
        const url = await uploadFile(file, "gallery");
        finalGallery.push(url);
      }

      const { error } = await supabase
        .from("teams")
        .update({
          logo_url: finalLogo,
          cover_url: finalCover,
          gallery_photos: finalGallery,
        })
        .eq("id", teamId);

      if (error) throw error;

      setLogoFile(null);
      setCoverFile(null);
      setPendingGalleryFiles([]);
      setPhotos(finalGallery);
      toast.success("🎉 媒體檔案已更新！");
      onUpdated();
    } catch (err) {
      toast.error("儲存失敗：" + (err instanceof Error ? err.message : "未知錯誤"));
    } finally {
      saveLock.unlock();
      setIsSaving(false);
    }
  };

  const cropPreset =
    cropTarget === "logo" ? "logo" : cropTarget === "cover" ? "team-cover" : "square";

  return (
    <div className="space-y-8">
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest pl-1">品牌視覺</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-600 transition">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFilePick(e, "logo")} />
            {logoPreview ? (
              <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                <Image src={logoPreview} alt="Logo" fill className="object-cover" />
              </div>
            ) : (
              <span className="text-2xl">📁</span>
            )}
            <div>
              <p className="text-xs font-black text-white">群組 Logo</p>
              <p className="text-[10px] text-zinc-500">{logoFile ? "已選擇新檔案" : "點擊上傳並裁切"}</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-600 transition">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFilePick(e, "cover")} />
            {coverPreview ? (
              <div className="relative w-20 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                <Image src={coverPreview} alt="Cover" fill className="object-cover" />
              </div>
            ) : (
              <span className="text-2xl">🏞️</span>
            )}
            <div>
              <p className="text-xs font-black text-white">封面橫幅</p>
              <p className="text-[10px] text-zinc-500">{coverFile ? "已選擇新檔案" : "點擊上傳並裁切"}</p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">相片集</p>
            <p className="text-xs text-zinc-500 mt-1">上傳訓練、比賽或團隊活動照片，將顯示於公開頁面的媒體分頁。</p>
          </div>
          <label className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 transition shrink-0">
            <UploadCloud className="w-3.5 h-3.5" />
            ＋ 上傳相片
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void startGalleryCrop(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {(photos.length > 0 || pendingGalleryFiles.length > 0) ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((url, idx) => (
              <div key={`saved-${url}-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-800 group">
                <Image src={url} alt="" fill className="object-cover" sizes="200px" />
                <button
                  type="button"
                  onClick={() => removePendingPhoto(idx)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/90 border border-slate-700 text-red-400 opacity-0 group-hover:opacity-100 transition"
                  title="移除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {pendingGalleryFiles.map((file, idx) => (
              <div key={`pending-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden border border-amber-500/40 ring-1 ring-amber-500/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute top-2 left-2 text-[9px] font-black uppercase bg-amber-950/90 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/40">
                  待儲存
                </span>
              </div>
            ))}
          </div>
        ) : (
          <TeamMediaGallery photos={[]} emptyLabel="尚無相片，點擊上方按鈕開始上傳。" />
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaving || !hasChanges}
        className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-3.5 rounded-xl transition shadow-[0_0_15px_rgba(217,119,6,0.3)] flex items-center justify-center gap-2"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {isSaving ? "上傳並儲存中..." : "💾 儲存媒體變更"}
      </button>

      <ImageCropModal
        open={cropTarget !== null}
        imageSrc={cropImageSrc}
        preset={cropPreset}
        filename={
          cropTarget === "logo"
            ? "team-logo.jpg"
            : cropTarget === "cover"
              ? "team-cover.jpg"
              : "team-photo.jpg"
        }
        onCancel={closeCropModal}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Cropper from "react-easy-crop";

// ==========================================
// Types
// ==========================================
interface Profile {
  id: string;
  full_name: string | null;
  first_name: string | null; 
  last_name: string | null;  
  handle: string | null;     
  headline: string | null;
  bio: string | null;
  location: string | null;
  country: string | null;    
  region: string | null;     
  avatar_url: string | null;
  is_coach: boolean | null;
  coach_rate: number | null;
  status_tag: string | null;
}

interface Sport {
  id: string;
  name: string;
}

interface UserSport {
  id: string;
  sport_id: string;
  metadata: { position?: string; [key: string]: any };
  sports: { name: string } | null;
}

interface MediaItem {
  id: string;
  sportName: string;
  type: "image" | "video";
  url: string;
  createdAt: string;
}

type TabId = "dashboard" | "arsenal" | "highlights" | "feed";
type FieldDef = { key: string; label: string; type: "select" | "text" | "number"; options?: string[]; placeholder?: string };

// ==========================================
// Constants & Static Data
// ==========================================
const TABS = [
  { id: "about",      icon: "👤", label: "個人檔案",    en: "About" },
  { id: "arsenal",    icon: "📋", label: "專長規格",    en: "Expertise" },
  { id: "highlights", icon: "🎞️", label: "賽事影音",    en: "Highlights" },
  { id: "feed",       icon: "📰", label: "產業動態",    en: "Feed" },
] as const;

// Phase 3: 動態表單引擎設定檔 (Schema)
const SPORT_SCHEMA: Record<string, FieldDef[]> = {
  "Basketball": [
    { key: "position", label: "場上定位", type: "select", options: ["PG 控球後衛", "SG 得分後衛", "SF 小前鋒", "PF 大前鋒", "C 中鋒"] },
    { key: "dominant_hand", label: "慣用手", type: "select", options: ["右手", "左手", "雙手皆可"] },
  ],
  "Tennis": [
    { key: "level", label: "NTRP 級別", type: "select", options: ["3.0", "3.5", "4.0", "4.5", "5.0", "5.5+"] },
    { key: "dominant_hand", label: "持拍手", type: "select", options: ["右手 (單反)", "右手 (雙反)", "左手 (單反)", "左手 (雙反)"] },
    { key: "preference", label: "打法偏好", type: "select", options: ["底線防守", "底線攻擊", "發球上網", "全場型"] },
  ],
  "Volleyball": [
    { key: "position", label: "場上定位", type: "select", options: ["主攻手 (OH)", "副攻手 (OPP)", "快攻手 (MB)", "舉球員 (S)", "自由球員 (L)"] },
    { key: "reach_height", label: "最高打點 (cm)", type: "number", placeholder: "例如: 310" },
  ],
  "default": [
    { key: "experience", label: "球齡或簡述", type: "text", placeholder: "例如: 5年校隊經驗、喜愛打雙打..." }
  ]
};

const INITIAL_GALLERY: MediaItem[] = [
  { id: "m-1", sportName: "Volleyball", type: "image", url: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=600&auto=format&fit=crop", createdAt: "2天前" },
  { id: "m-2", sportName: "Volleyball", type: "image", url: "https://images.unsplash.com/photo-1592656094267-764a45160876?q=80&w=600&auto=format&fit=crop", createdAt: "1週前" },
  { id: "m-3", sportName: "Training",   type: "image", url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop", createdAt: "2週前" },
];

const DEFAULT_FORM = {
  first_name: "", last_name: "", handle: "", full_name: "", headline: "", 
  location: "", country: "", region: "", bio: "", avatar_url: "", 
  is_coach: false, coach_rate: 0, status_tag: "inactive",
};

// ==========================================
// Helpers (Compression & Cropping)
// ==========================================
const compressImage = (file: File | Blob): Promise<File | Blob> =>
  new Promise((resolve) => {
    if (file.size <= 1.5 * 1024 * 1024) return resolve(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => resolve(blob ? new File([blob], file instanceof File ? file.name : "cropped.jpg", { type: "image/jpeg" }) : file),
          "image/jpeg", 0.8
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );
  return new Promise((resolve) => {
    canvas.toBlob((file) => resolve(file), "image/jpeg");
  });
};

const StatusBadge = ({ tag }: { tag: string | null }) => {
  if (tag === "recruiting")
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 招生中
      </div>
    );
  if (tag === "seeking_team")
    return (
      <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(59,130,246,0.2)]">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍
      </div>
    );
  if (tag === "open_to_match")
    return (
      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 開放約戰
      </div>
    );
  return (
    <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態
    </div>
  );
};

// ==========================================
// Main Component
// ==========================================
function ProfilePageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const avatarInputRef    = useRef<HTMLInputElement>(null);
  const mediaInputRef     = useRef<HTMLInputElement>(null);
  const pendingAvatarFile = useRef<File | Blob | null>(null);
  const blobUrlRef        = useRef<string | null>(null);

  // Core Data State
  const [user,       setUser]       = useState<any>(null);
  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [allSports,  setAllSports]  = useState<Sport[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);
  const [editForm,  setEditForm]  = useState(DEFAULT_FORM);
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [locationData, setLocationData] = useState<Record<string, string[]>>({});

  // Cropper State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Sport Engine State
  const [isSportModalOpen,  setIsSportModalOpen]  = useState(false);
  const [selectedSportId,   setSelectedSportId]   = useState("");
  const [sportDynamicData,  setSportDynamicData]  = useState<{ [key: string]: string }>({});
  const [isSubmittingSport, setIsSubmittingSport] = useState(false);
  const [editingUserSportId, setEditingUserSportId] = useState<string | null>(null);
  
  // Media State
  const [isMediaModalOpen,  setIsMediaModalOpen]  = useState(false);
  const [uploadMediaSport,  setUploadMediaSport]  = useState("");
  const [isUploadingMedia,  setIsUploadingMedia]  = useState(false);
  const [galleryMedia,      setGalleryMedia]      = useState<MediaItem[]>(INITIAL_GALLERY);
  const [selectedPost,      setSelectedPost]      = useState<MediaItem | null>(null);

  // ==========================================
  // Data Loaders & Effects
  // ==========================================
  const loadProfileData = useCallback(async (userId: string) => {
    try {
      const [{ data: prof }, { data: usData }, { data: sData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("user_sports").select("id, sport_id, metadata, sports(name)").eq("user_id", userId),
        supabase.from("sports").select("*").order("name", { ascending: true }),
      ]);

      if (prof) {
        setProfile(prof);
        setEditForm({
          first_name: prof.first_name ?? "", last_name: prof.last_name ?? "", handle: prof.handle ?? "",
          full_name:  prof.full_name  ?? "", headline:   prof.headline   ?? "", location:   prof.location   ?? "",
          country: prof.country ?? "", region: prof.region ?? "", bio: prof.bio ?? "",
          avatar_url: prof.avatar_url ?? "", is_coach:   prof.is_coach   ?? false,
          coach_rate: prof.coach_rate ?? 0, status_tag: prof.status_tag ?? "inactive",
        });
      }
      if (usData) setUserSports(usData as unknown as UserSport[]);
      if (sData)  setAllSports(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) { setUser(authUser); loadProfileData(authUser.id); }
      else setIsLoading(false);
    });
  }, [loadProfileData, supabase]);

  useEffect(() => {
    if (!isEditing || editForm.handle === profile?.handle || editForm.handle.length < 3) { 
      setHandleStatus("idle"); 
      return; 
    }
    const timer = setTimeout(async () => {
      setHandleStatus("checking");
      const { data } = await supabase.from("profiles").select("id").eq("handle", editForm.handle).neq("id", user?.id).maybeSingle();
      setHandleStatus(data ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [editForm.handle, isEditing, user?.id, profile?.handle, supabase]);

  useEffect(() => {
    if (isEditing && Object.keys(locationData).length === 0) {
      fetch('/locations.json')
        .then(res => {
          if (!res.ok) throw new Error("locations.json not found");
          return res.json();
        })
        .then(data => setLocationData(data))
        .catch(err => console.error("無法載入地理資料:", err));
    }
  }, [isEditing, locationData]);

  // ==========================================
  // Handlers
  // ==========================================
  const onAvatarFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setCropImageSrc(reader.result?.toString() || "");
        setIsCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  }, []);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirmCrop = useCallback(async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (!croppedBlob) return;
      const compressed = await compressImage(croppedBlob);
      pendingAvatarFile.current = compressed;
      
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const localUrl = URL.createObjectURL(compressed);
      blobUrlRef.current = localUrl;
      setEditForm(prev => ({ ...prev, avatar_url: localUrl }));
      setIsCropModalOpen(false);
      setCropImageSrc(null);
    } catch (e) {
      console.error("Cropping failed", e);
    }
  }, [cropImageSrc, croppedAreaPixels]);

  const handleSaveProfile = useCallback(async () => {
    if (!user || handleStatus === "taken") return;
    setIsSaving(true);
    let finalAvatarUrl = editForm.avatar_url;

    if (pendingAvatarFile.current) {
      const filePath = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, pendingAvatarFile.current, { upsert: true });
      if (uploadError) {
        alert("頭像上傳雲端失敗：" + uploadError.message);
        setIsSaving(false);
        return;
      }
      finalAvatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
      pendingAvatarFile.current = null;
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    }

    const fullName = `${editForm.first_name} ${editForm.last_name}`.trim();
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      first_name: editForm.first_name, last_name: editForm.last_name, handle: editForm.handle,
      full_name: fullName, headline: editForm.headline, country: editForm.country, region: editForm.region,
      location: editForm.region ? `${editForm.region}, ${editForm.country}` : editForm.country, bio: editForm.bio, avatar_url: finalAvatarUrl,
      is_coach: editForm.is_coach, coach_rate: Number(editForm.coach_rate), status_tag: editForm.status_tag,
    });

    if (!error) {
      setProfile(prev => ({ ...prev!, ...editForm, avatar_url: finalAvatarUrl, full_name: fullName, location: `${editForm.region}, ${editForm.country}` }));
      setIsEditing(false);
    } else {
      alert("資料庫同步失敗：" + error.message);
    }
    setIsSaving(false);
  }, [user, editForm, handleStatus, supabase]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    pendingAvatarFile.current = null;
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    if (user) loadProfileData(user.id);
  }, [user, loadProfileData]);

  // Sport Engine Handlers
  const handleOpenSportModal = useCallback((us?: UserSport) => {
    if (us) {
      setSelectedSportId(us.sport_id);
      setSportDynamicData(us.metadata || {});
      setEditingUserSportId(us.id);
    } else {
      setSelectedSportId("");
      setSportDynamicData({});
      setEditingUserSportId(null);
    }
    setIsSportModalOpen(true);
  }, []);

  const handleSaveSport = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSportId || !user) return;
    setIsSubmittingSport(true);

    if (editingUserSportId) {
      const { error } = await supabase.from("user_sports").update({ sport_id: selectedSportId, metadata: sportDynamicData }).eq("id", editingUserSportId);
      if (!error) { await loadProfileData(user.id); setIsSportModalOpen(false); }
      else alert("更新失敗");
    } else {
      const { error } = await supabase.from("user_sports").insert({ user_id: user.id, sport_id: selectedSportId, metadata: sportDynamicData });
      if (!error) { await loadProfileData(user.id); setIsSportModalOpen(false); }
      else alert("新增失敗");
    }
    setIsSubmittingSport(false);
  }, [selectedSportId, sportDynamicData, user, editingUserSportId, supabase, loadProfileData]);

  const handleRemoveSport = useCallback(async (us: UserSport) => {
    if (!window.confirm(`確定要自武器庫移除 ${us.sports?.name} 嗎？`)) return;
    const { error } = await supabase.from("user_sports").delete().eq("id", us.id);
    if (!error) setUserSports(prev => prev.filter(item => item.id !== us.id));
  }, [supabase]);

  // Media Handlers
  const handleMediaUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !uploadMediaSport || !user) return;
    setIsUploadingMedia(true);
    const fileToUpload = await compressImage(rawFile);
    const fileExt  = rawFile.name.split(".").pop();
    const filePath = `${user.id}/highlight-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("highlights").upload(filePath, fileToUpload);
    if (error) { alert("上傳失敗"); setIsUploadingMedia(false); return; }
    const publicUrl = supabase.storage.from("highlights").getPublicUrl(filePath).data.publicUrl;
    setGalleryMedia(prev => [{ id: Date.now().toString(), sportName: uploadMediaSport, type: "image", url: publicUrl, createdAt: "剛剛" }, ...prev]);
    setIsMediaModalOpen(false); setUploadMediaSport(""); setIsUploadingMedia(false);
  }, [uploadMediaSport, user, supabase]);

  const handleShareLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${user?.id}`);
    alert("名片網址已複製！");
  }, [user]);

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">安全連線中...</div>;

  const avatarSrc = editForm.avatar_url || profile?.avatar_url || "";
  const selectedSportInfo = allSports.find(s => s.id === selectedSportId);

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Left Sidebar (Identity Layer) ── */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 sticky top-20 shadow-2xl">

              <div className="relative w-32 h-32 mx-auto mb-6">
                <div
                  className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 shadow-xl overflow-hidden flex items-center justify-center text-4xl font-black text-zinc-600 bg-cover bg-center"
                  style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }}
                >
                  {!avatarSrc && (profile?.first_name?.[0] || profile?.full_name?.[0] || "PRO")}
                </div>
                {isEditing && (
                  <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-slate-950/60 rounded-full flex flex-col items-center justify-center text-white text-xs font-bold border border-dashed border-slate-400 backdrop-blur-sm z-10 hover:bg-slate-900/60 transition">
                    📸 換照片
                  </button>
                )}
                <input type="file" ref={avatarInputRef} onChange={onAvatarFileChange} accept="image/*" className="hidden" />
                <div className="absolute -bottom-3 -right-6 z-20">
                  <StatusBadge tag={isEditing ? editForm.status_tag : profile?.status_tag ?? null} />
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">名 First</label>
                      <input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">姓 Last</label>
                      <input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Unique Handle</label>
                    <input className={`w-full bg-slate-950/50 border rounded-xl p-3 text-white text-sm ${handleStatus === 'taken' ? 'border-red-500' : 'border-slate-800'}`} value={editForm.handle} onChange={e => setEditForm({ ...editForm, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} placeholder="Instagram 風格帳號" />
                    {handleStatus === 'taken' && <p className="text-[10px] text-red-400 px-1">✗ 帳號已被使用</p>}
                    {handleStatus === 'available' && <p className="text-[10px] text-emerald-400 px-1">✓ 帳號可使用</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Headline</label>
                    <input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.headline} onChange={e => setEditForm({ ...editForm, headline: e.target.value })} placeholder="例如: 網球底線玩家" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">國家</label>
                      <select className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none" value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value, region: "" })}>
                        <option value="">選擇國家</option>
                        {Object.keys(locationData).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">地區</label>
                      <select className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none" value={editForm.region} onChange={e => setEditForm({ ...editForm, region: e.target.value })}>
                        <option value="">選擇區域</option>
                        {editForm.country && locationData[editForm.country]?.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Bio</label>
                    <textarea className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm h-24 resize-none" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="寫下你的訓練哲學..." />
                  </div>

                  <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-4 mt-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">招募意向狀態</label>
                      <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs outline-none" value={editForm.status_tag} onChange={e => setEditForm(prev => ({ ...prev, status_tag: e.target.value }))}>
                        <option value="recruiting">🟢 招生中 (Accepting Students)</option>
                        <option value="seeking_team">🔵 尋找隊伍 (Seeking Team)</option>
                        <option value="open_to_match">🟡 開放約戰 (Open to Match)</option>
                        <option value="committed">⚪ 穩定狀態 (Committed)</option>
                      </select>
                    </div>
                    <div className="pt-3 border-t border-slate-800/80">
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" checked={editForm.is_coach} onChange={e => setEditForm(prev => ({ ...prev, is_coach: e.target.checked }))} className="rounded bg-slate-900 border-slate-700" />
                        <span className="text-xs font-bold text-white">開啟教練模式</span>
                      </label>
                      {editForm.is_coach && (
                        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
                          <span className="text-xs text-zinc-400 pl-1">時薪 HK$</span>
                          <input type="number" className="flex-1 bg-transparent text-white font-bold text-right outline-none text-sm" value={editForm.coach_rate} onChange={e => setEditForm(prev => ({ ...prev, coach_rate: Number(e.target.value) }))} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button onClick={handleSaveProfile} disabled={isSaving || handleStatus === 'taken'} className="flex-1 bg-slate-50 hover:bg-slate-200 text-black font-black py-3 rounded-xl transition disabled:opacity-50">
                      {isSaving ? "同步中..." : "完成變更"}
                    </button>
                    <button onClick={handleCancelEdit} className="px-4 bg-slate-800 text-zinc-300 font-bold rounded-xl hover:bg-slate-700 transition">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center animate-fadeIn mt-2">
                  <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">
                    {profile?.first_name} {profile?.last_name}
                  </h1>
                  <p className="text-sm font-mono text-blue-400 mb-4">
                    @{profile?.handle || "ID_未設定"}
                  </p>
                  <p className="text-sm font-bold text-zinc-400 mb-4">
                    {profile?.headline || "設定你的場上宣言"}
                  </p>
                  {profile?.is_coach && (
                    <div className="inline-block bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-xs font-black px-4 py-1.5 rounded-full mb-4">
                      🏆 認證教練 ｜ HK$ {profile.coach_rate}/hr
                    </div>
                  )}
                  <p className="text-sm text-zinc-300 leading-relaxed text-left bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 mb-6">
                    {profile?.bio || "寫下一段關於你的體育歷程，讓球探或隊員更認識你。"}
                  </p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setIsEditing(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                      ✏️ 編輯檔案
                    </button>
                    <button onClick={handleShareLink} className="w-full bg-transparent border border-slate-700 hover:border-slate-500 text-zinc-300 font-bold py-3 rounded-xl transition">
                      分享連結 ↗
                    </button>
                  </div>
                  <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-500 font-medium">
                    <span>📍 {profile?.region ? `${profile.region}, ${profile.country}` : "位置未公開"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Main Area ── */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
           {/* 🚀 強制等分寬度、自動適應螢幕的雙語標籤列 */}
            <div className="bg-pro-slate-900/60 backdrop-blur-xl border border-pro-slate-800/80 p-1 rounded-2xl flex w-full sticky top-16 z-30 mb-8 shadow-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 min-w-0 ${
                    activeTab === t.id
                      ? "bg-pro-slate-50 text-black shadow-lg scale-[1.02]"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  <span className="text-lg md:text-xl mb-0.5">{t.icon}</span>
                  <span className="text-[9px] md:text-xs font-black leading-tight truncate w-full text-center">
                    {t.label}
                  </span>
                  <span className="text-[8px] md:text-[10px] font-medium opacity-70 truncate w-full text-center">
                    {t.en}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1">
              {/* Dashboard */}
              {activeTab === "dashboard" && (
                <div className="space-y-6 animate-fadeIn">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl backdrop-blur-sm flex flex-col justify-center">
                      <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Views</span>
                      <span className="text-3xl font-black text-white">1,204</span>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl backdrop-blur-sm flex flex-col justify-center">
                      <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Scout Search</span>
                      <span className="text-3xl font-black text-blue-400">48</span>
                    </div>
                    <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-500/20 p-5 rounded-3xl flex items-center justify-between">
                      <div>
                        <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest block mb-1">Rankings</span>
                        <span className="text-xl font-black text-white">Top 5% 活躍度</span>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-xl">🔥</div>
                    </div>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🏆</div>
                    <h3 className="text-white font-bold mb-2">準備好參加賽事了嗎？</h3>
                    <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                      完善你的「專長規格」與「賽事影音」，雲端資料庫已就緒，系統將為您智慧推播最合適的戰隊職缺。
                    </p>
                  </div>
                </div>
              )}

              {/* Arsenal */}
              {activeTab === "arsenal" && (
                <div className="animate-fadeIn space-y-6">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <div>
                      <h2 className="text-xl font-black text-white">認證裝備與專長規格</h2>
                      <p className="text-xs text-zinc-500 mt-1">展示你的場上真實硬參數</p>
                    </div>
                    <button onClick={() => handleOpenSportModal()} className="bg-slate-50 text-black text-xs font-black px-4 py-2.5 rounded-full hover:scale-105 transition shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                      ＋ 新增專長項目
                    </button>
                  </div>
                  {userSports.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-700/50 rounded-3xl">
                      <p className="text-zinc-500 text-sm font-bold">空蕩蕩的專長欄... 立即宣告你的專業項目！</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {userSports.map((us) => (
                        <div key={us.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden hover:border-slate-600 transition duration-300 flex flex-col justify-between">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4" />
                          <div>
                            <div className="flex items-center justify-between mb-4 relative z-10">
                              <span className="text-xl font-black text-white tracking-tight">{us.sports?.name}</span>
                            </div>
                            <div className="space-y-2 relative z-10">
                              {Object.entries(us.metadata || {}).map(([key, val]) => (
                                <div key={key} className="flex justify-between items-center text-sm pb-1 border-b border-slate-800/50 last:border-0">
                                  <span className="text-zinc-500 font-bold capitalize">{key}</span>
                                  <span className="text-blue-400 font-black">{val as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="pt-4 mt-4 border-t border-slate-800/80 flex justify-end gap-3 relative z-10">
                            <button onClick={() => handleOpenSportModal(us)} className="text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl border border-blue-500/20 transition">
                              ✏️ 編輯規格
                            </button>
                            <button onClick={() => handleRemoveSport(us)} className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500/20 transition">
                              🗑️ 移除項目
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Highlights (IG Style Grid) */}
              {activeTab === "highlights" && (
                <div className="animate-fadeIn space-y-6">
                  <div className="flex flex-wrap justify-between items-end mb-2 px-2 gap-4">
                    <div>
                      <h2 className="text-xl font-black text-white">賽場高清圖庫</h2>
                      <p className="text-xs text-zinc-500 mt-1">直連雲端 Storage CDN 的視覺歷程</p>
                    </div>
                    {userSports.length > 0 ? (
                      <button onClick={() => setIsMediaModalOpen(true)} className="bg-slate-50 text-black text-xs font-black px-4 py-2.5 rounded-full hover:scale-105 transition shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                        📸 上傳新高光
                      </button>
                    ) : (
                      <p className="text-xs text-amber-500 font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                        請先宣告「專長規格」項目
                      </p>
                    )}
                  </div>
                  
                  {/* IG 風格 3 宮格相片牆 */}
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {galleryMedia.map(m => (
                      <div key={m.id} onClick={() => setSelectedPost(m)} className="relative group aspect-square overflow-hidden bg-slate-900 cursor-pointer">
                        <img src={m.url} alt={m.sportName} loading="lazy" decoding="async" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-2 md:p-4">
                          <span className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-wider mb-1">{m.sportName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feed */}
              {activeTab === "feed" && (
                <div className="animate-fadeIn space-y-6 max-w-3xl">
                   <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center flex-shrink-0" style={{ backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : "none" }} />
                      <div>
                        <h4 className="text-sm font-black text-white">{profile?.first_name} {profile?.last_name}</h4>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Just now • Professional Feed</span>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                      成功對接雲端金庫！未來的賽事動態與發表，都將受到資料庫最高層級的 RLS 安全防禦保障。🔥
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      
      {/* 1. Cropper Modal */}
      {isCropModalOpen && cropImageSrc && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md h-[400px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl mb-6">
            <Cropper
              image={cropImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="w-full max-w-md flex gap-4">
            <button onClick={() => { setIsCropModalOpen(false); setCropImageSrc(null); }} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl">
              取消
            </button>
            <button onClick={handleConfirmCrop} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl">
              確認裁切
            </button>
          </div>
        </div>
      )}

      {/* 2. Sport Config-Driven Modal */}
      {isSportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">{editingUserSportId ? "編輯專長規格" : "添入專長規格"}</h3>
            <form onSubmit={handleSaveSport} className="space-y-5 text-sm">
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">選擇運動項目</label>
                <select value={selectedSportId} onChange={e => { setSelectedSportId(e.target.value); setSportDynamicData({}); }} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-bold outline-none" required>
                  <option value="">-- 選擇項目 --</option>
                  {allSports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* 🚀 動態表單渲染引擎 */}
              {selectedSportInfo && (SPORT_SCHEMA[selectedSportInfo.name] || SPORT_SCHEMA["default"]).map(field => (
                <div key={field.key} className="animate-fadeIn">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{field.label}</label>
                  {field.type === "select" ? (
                    <select value={sportDynamicData[field.key] || ""} onChange={e => setSportDynamicData({ ...sportDynamicData, [field.key]: e.target.value })} className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl p-3.5 text-white font-bold outline-none transition" required>
                      <option value="">-- 請選擇 --</option>
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} value={sportDynamicData[field.key] || ""} onChange={e => setSportDynamicData({ ...sportDynamicData, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl p-3.5 text-white font-bold outline-none transition" required />
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsSportModalOpen(false)} className="flex-1 bg-slate-900 text-zinc-400 font-bold py-3 rounded-xl">
                  取消
                </button>
                <button type="submit" disabled={isSubmittingSport || !selectedSportId} className="flex-1 bg-slate-50 text-black font-black py-3 rounded-xl disabled:opacity-50">
                  {isSubmittingSport ? "同步中..." : editingUserSportId ? "儲存變更" : "確認加入"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Media Upload Modal */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
             <h3 className="text-lg font-black text-white mb-6">歸檔雲端賽事影音</h3>
            <div className="space-y-5 text-sm">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">1. 歸屬類別</label>
                <select value={uploadMediaSport} onChange={e => setUploadMediaSport(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-bold outline-none">
                  <option value="">-- 選擇專長 --</option>
                  {userSports.map(us => <option key={us.id} value={us.sports?.name}>{us.sports?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">2. 選擇檔案</label>
                <div className="border-2 border-dashed border-slate-800 hover:border-slate-600 transition rounded-xl p-4 text-center cursor-pointer relative overflow-hidden">
                  <input type="file" ref={mediaInputRef} onChange={handleMediaUpload} accept="image/*" disabled={!uploadMediaSport || isUploadingMedia} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                  <span className="text-zinc-400 font-bold block">{isUploadingMedia ? "雲端推流中..." : uploadMediaSport ? "點擊選擇照片" : "請先選擇上方類別"}</span>
                </div>
              </div>
              <button onClick={() => setIsMediaModalOpen(false)} className="w-full bg-slate-900 text-zinc-400 font-bold py-3 rounded-xl mt-2">
                關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Instagram-Style Post Lightbox */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-0 md:p-8 animate-fadeIn">
          <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 md:top-6 md:right-6 text-white text-3xl font-black z-50 hover:scale-110 transition">
            ×
          </button>
          <div className="w-full max-w-6xl max-h-[100dvh] md:max-h-[85vh] bg-slate-950 md:rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-800 shadow-2xl relative">
            <div className="w-full md:w-3/5 bg-black flex items-center justify-center relative min-h-[40vh] md:min-h-0">
              <img src={selectedPost.url} alt="Post highlight" className="max-w-full max-h-[85vh] object-contain" />
            </div>
            <div className="w-full md:w-2/5 flex flex-col h-[60vh] md:h-full bg-slate-950">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 bg-cover bg-center border border-slate-600" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} />
                  <div>
                    <p className="text-sm font-black text-white">{profile?.handle || profile?.first_name || "Athlete"}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{selectedPost.sportName} • {selectedPost.createdAt}</p>
                  </div>
                </div>
                <button className="text-red-400 hover:text-red-300 text-xs font-bold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition">刪除</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900 border border-blue-700 shrink-0 flex items-center justify-center text-xs font-bold text-white">S</div>
                  <div>
                    <p className="text-sm leading-snug"><span className="font-bold text-white mr-2 hover:underline cursor-pointer">scout_official</span><span className="text-zinc-300">Great form! Are you looking for a team this season? 🔥</span></p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-[10px] text-zinc-500 font-bold">2h</span>
                      <span className="text-[10px] text-zinc-500 font-bold hover:text-white cursor-pointer">Reply</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-950">
                <div className="flex gap-4 mb-3">
                  <button className="text-2xl hover:scale-110 transition transform active:scale-95 grayscale hover:grayscale-0">❤️</button>
                  <button className="text-2xl hover:scale-110 transition grayscale hover:grayscale-0">💬</button>
                </div>
                <p className="text-sm font-bold text-white mb-3">24 likes</p>
                <div className="flex gap-2 relative">
                  <input type="text" placeholder="Add a comment..." className="w-full bg-slate-900 border border-slate-800 rounded-full py-3 pl-4 pr-16 text-sm text-white focus:outline-none focus:border-slate-600 transition" />
                  <button className="absolute right-4 top-3 text-blue-500 font-bold text-sm hover:text-blue-400 transition">Post</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(ProfilePageContent), { ssr: false });
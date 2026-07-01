"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Cropper from "react-easy-crop";
import { BackButton } from "@/components/BackButton";

interface Profile {
  id: string; full_name: string | null; first_name: string | null; last_name: string | null; handle: string | null; headline: string | null; bio: string | null; location: string | null; country: string | null; region: string | null; avatar_url: string | null; status_tag: string | null; display_sports: string[] | null;
  is_coach: boolean | null; 
  is_physio: boolean | null; physio_rate: number | string; clinic_name: string | null; physio_status: string | null; physio_country: string | null; physio_region: string | null;
}

// 💡 修正 rate 允許為 string，解決 0 無法被刪除的問題
interface CoachProfile { id: string; sport: string; rate: number | string; status: string; country: string; region: string; }
interface Sport { id: string; name: string; }
interface UserSport { id: string; sport_id: string; metadata: { position?: string; [key: string]: any }; sports: { name: string } | null; }
interface MediaItem { id: string; sportName: string; type: "image" | "video"; url: string; fileName?: string; createdAt: string; }

type TabId = "dashboard" | "expertise" | "highlights" | "feed" | "coach" | "physio";
type FieldDef = { key: string; label: string; type: "select" | "text" | "number"; options?: string[]; placeholder?: string };

const SPORT_SCHEMA: Record<string, FieldDef[]> = {
  "Basketball": [ { key: "position", label: "場上定位", type: "select", options: ["PG 控球後衛", "SG 得分後衛", "SF 小前鋒", "PF 大前鋒", "C 中鋒"] }, { key: "dominant_hand", label: "慣用手", type: "select", options: ["右手", "左手", "雙手皆可"] } ],
  "Tennis": [ { key: "level", label: "NTRP 級別", type: "select", options: ["3.0", "3.5", "4.0", "4.5", "5.0", "5.5+"] }, { key: "dominant_hand", label: "持拍手", type: "select", options: ["右手 (單反)", "右手 (雙反)", "左手 (單反)", "左手 (雙反)"] }, { key: "preference", label: "打法偏好", type: "select", options: ["底線防守", "底線攻擊", "發球上網", "全場型"] } ],
  "Volleyball": [ { key: "position", label: "場上定位", type: "select", options: ["主攻手 (OH)", "副攻手 (OPP)", "快攻手 (MB)", "舉球員 (S)", "自由球員 (L)"] }, { key: "reach_height", label: "最高打點 (cm)", type: "number", placeholder: "例如: 310" } ],
  "default": [ { key: "experience", label: "球齡或簡述", type: "text", placeholder: "例如: 5年經驗..." } ]
};

const DEFAULT_FORM = {
  first_name: "", last_name: "", handle: "", full_name: "", headline: "", location: "", country: "", region: "", bio: "", avatar_url: "", status_tag: "committed", display_sports: [] as string[],
  is_coach: false, 
  is_physio: false, physio_rate: "" as number | string, clinic_name: "", physio_status: "hidden", physio_country: "", physio_region: ""
};

const compressImage = (file: File | Blob): Promise<File | Blob> => new Promise((resolve) => { if (file.size <= 1.5 * 1024 * 1024) return resolve(file); const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { const MAX = 1200; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } } else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } } const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; const ctx = canvas.getContext("2d"); if (!ctx) return resolve(file); ctx.drawImage(img, 0, 0, w, h); canvas.toBlob((blob) => resolve(blob ? new File([blob], file instanceof File ? file.name : "cropped.jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.8); }; img.src = e.target?.result as string; }; reader.readAsDataURL(file); });
const createImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => { const image = new Image(); image.addEventListener("load", () => resolve(image)); image.addEventListener("error", (error) => reject(error)); image.src = url; });
const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => { const image = await createImage(imageSrc); const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); if (!ctx) return null; canvas.width = pixelCrop.width; canvas.height = pixelCrop.height; ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height); return new Promise((resolve) => { canvas.toBlob((file) => resolve(file), "image/jpeg"); }); };

const StatusBadge = ({ tag }: { tag: string | null }) => {
  if (tag === "hidden" || tag === "draft") return <div className="inline-flex items-center gap-1.5 bg-slate-800 text-zinc-500 text-[10px] px-2.5 py-1 rounded-full font-black border border-slate-700">🔒 未發布 (隱藏中)</div>;
  if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 招生/招募中</div>;
  if (tag === "seeking_team") return <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍</div>;
  if (tag === "open_to_match") return <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 開放約戰</div>;
  if (tag === "available") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 開放預約</div>;
  if (tag === "busy" || tag === "full") return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿員/滿診</div>;
  return <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態</div>;
};

function ProfilePageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const pendingAvatarFile = useRef<File | Blob | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coachProfiles, setCoachProfiles] = useState<CoachProfile[]>([]);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState(DEFAULT_FORM);
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [locationData, setLocationData] = useState<Record<string, string[]>>({});

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [sportDynamicData, setSportDynamicData] = useState<{ [key: string]: string }>({});
  const [editingUserSportId, setEditingUserSportId] = useState<string | null>(null);
  
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [uploadMediaSport, setUploadMediaSport] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false); // 💡 把這行加回來！
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);
  const [selectedPost, setSelectedPost] = useState<MediaItem | null>(null);

  const dynamicTabs = useMemo(() => {
    const base: { id: TabId; icon: string; label: string; en: string }[] = [
      { id: "dashboard", icon: "📊", label: "個人後台", en: "Dashboard" },
      { id: "expertise", icon: "📋", label: "技術特長", en: "Expertise" },
      { id: "highlights", icon: "🎞️", label: "賽場圖庫", en: "Highlights" },
      { id: "feed", icon: "📰", label: "個人動態", en: "Feed" },
    ];
    if (profile?.is_coach || editForm.is_coach) base.push({ id: "coach", icon: "🎓", label: "教練設定", en: "Coach" });
    if (profile?.is_physio || editForm.is_physio) base.push({ id: "physio", icon: "⚕️", label: "治療設定", en: "Physio" });
    return base;
  }, [profile?.is_coach, profile?.is_physio, editForm.is_coach, editForm.is_physio]);

  const loadProfileData = useCallback(async (userId: string) => {
    try {
      // 💡 現在一併從資料庫抓取 locations 表
      const [{ data: prof }, { data: usData }, { data: sData }, { data: coachesData }, { data: locData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("user_sports").select("id, sport_id, metadata, sports(name)").eq("user_id", userId),
        supabase.from("sports").select("*").order("name", { ascending: true }),
        supabase.from("coach_profiles").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
        supabase.from("locations").select("country, region")
      ]);

      if (locData) {
        const locMap: Record<string, string[]> = {};
        locData.forEach(item => {
          if (!locMap[item.country]) locMap[item.country] = [];
          if (!locMap[item.country].includes(item.region)) locMap[item.country].push(item.region);
        });
        setLocationData(locMap);
      }

      if (prof) {
        setProfile(prof);
        setEditForm({
          first_name: prof.first_name ?? "", last_name: prof.last_name ?? "", handle: prof.handle ?? "", full_name: prof.full_name ?? "", headline: prof.headline ?? "", location: prof.location ?? "", country: prof.country ?? "", region: prof.region ?? "", bio: prof.bio ?? "", avatar_url: prof.avatar_url ?? "", status_tag: prof.status_tag ?? "committed", display_sports: prof.display_sports ?? [],
          is_coach: prof.is_coach ?? false, 
          is_physio: prof.is_physio ?? false, physio_rate: prof.physio_rate === 0 ? "" : (prof.physio_rate ?? ""), clinic_name: prof.clinic_name ?? "", physio_status: prof.physio_status ?? "hidden", physio_country: prof.physio_country ?? "", physio_region: prof.physio_region ?? ""
        });
      }
      if (usData) setUserSports(usData as unknown as UserSport[]);
      if (sData) setAllSports(sData);
      
      // 將載入的 Coach 費用如果是 0，轉成空字串方便編輯
      if (coachesData) {
        setCoachProfiles(coachesData.map(c => ({ ...c, rate: c.rate === 0 ? "" : c.rate })));
      }

      const { data: files } = await supabase.storage.from("highlights").list(`${userId}/`, { limit: 20, sortBy: { column: "created_at", order: "desc" } });
      if (files && files.length > 0) {
        const fetchedGallery = files.filter(f => f.name !== ".emptyFolderPlaceholder").map(file => {
            const { data: urlData } = supabase.storage.from("highlights").getPublicUrl(`${userId}/${file.name}`);
            return { id: file.id || file.name, sportName: "Highlight", type: "image" as const, url: urlData.publicUrl, fileName: file.name, createdAt: file.created_at ? new Date(file.created_at).toLocaleDateString() : "最近上傳" };
        });
        setGalleryMedia(fetchedGallery);
      } else setGalleryMedia([]);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => { if (authUser) { setUser(authUser); loadProfileData(authUser.id); } else setIsLoading(false); });
  }, [loadProfileData, supabase]);

  useEffect(() => {
    if (!isEditing || editForm.handle === profile?.handle || editForm.handle.length < 3) { setHandleStatus("idle"); return; }
    const timer = setTimeout(async () => {
      setHandleStatus("checking");
      const { data } = await supabase.from("profiles").select("id").eq("handle", editForm.handle).neq("id", user?.id).maybeSingle();
      setHandleStatus(data ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [editForm.handle, isEditing, user?.id, profile?.handle, supabase]);

  const onAvatarFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]; const reader = new FileReader();
      reader.addEventListener("load", () => { setCropImageSrc(reader.result?.toString() || ""); setIsCropModalOpen(true); });
      reader.readAsDataURL(file);
    }
  }, []);

  const handleConfirmCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (!croppedBlob) return;
      const compressed = await compressImage(croppedBlob);
      pendingAvatarFile.current = compressed;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const localUrl = URL.createObjectURL(compressed); blobUrlRef.current = localUrl;
      setEditForm(prev => ({ ...prev, avatar_url: localUrl }));
      setIsCropModalOpen(false); setCropImageSrc(null);
    } catch (e) { console.error(e); }
  };

  const handleSaveProfile = async () => {
    if (!user || handleStatus === "taken") return;
    setIsSaving(true);
    let finalAvatarUrl = editForm.avatar_url;
    if (pendingAvatarFile.current) {
      const filePath = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, pendingAvatarFile.current, { upsert: true });
      if (!uploadError) finalAvatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
      pendingAvatarFile.current = null; if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    }
    const fullName = `${editForm.first_name} ${editForm.last_name}`.trim();
    
    // 儲存時將空字串的安全轉型為 0，避免資料庫報錯
    const physioRateVal = Number(editForm.physio_rate) || 0;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id, first_name: editForm.first_name, last_name: editForm.last_name, handle: editForm.handle, full_name: fullName, headline: editForm.headline, country: editForm.country, region: editForm.region, location: editForm.region ? `${editForm.region}, ${editForm.country}` : editForm.country, bio: editForm.bio, avatar_url: finalAvatarUrl, status_tag: editForm.status_tag, display_sports: editForm.display_sports,
      is_coach: editForm.is_coach, 
      is_physio: editForm.is_physio, physio_rate: physioRateVal, clinic_name: editForm.clinic_name, physio_status: editForm.physio_status, physio_country: editForm.physio_country, physio_region: editForm.physio_region
    });
    if (!error) {
      setProfile(prev => ({ ...prev!, ...editForm, avatar_url: finalAvatarUrl, full_name: fullName, location: `${editForm.region}, ${editForm.country}` }));
      setIsEditing(false); router.refresh();
      if (editForm.is_coach && !profile?.is_coach) setActiveTab("coach"); else if (editForm.is_physio && !profile?.is_physio) setActiveTab("physio");
    } else alert("同步失敗");
    setIsSaving(false);
  };

  const addCoachProfile = () => {
    // 💡 新增卡片時 rate 預設給空字串，才不會卡著一個 0
    const newCoach: CoachProfile = { id: `new_${Date.now()}`, sport: "", rate: "", status: "hidden", country: "", region: "" };
    setCoachProfiles([...coachProfiles, newCoach]);
  };

  const updateCoachProfile = (id: string, field: keyof CoachProfile, value: any) => {
    setCoachProfiles(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const saveCoachProfile = async (coach: CoachProfile) => {
    if (!user || !coach.sport) return alert("請選擇專項");
    const isNew = coach.id.startsWith("new_");
    
    // 儲存時將空字串的安全轉型為 0
    const rateVal = Number(coach.rate) || 0;
    const payload = { user_id: user.id, sport: coach.sport, rate: rateVal, status: coach.status, country: coach.country, region: coach.region };
    
    if (isNew) {
      const { error } = await supabase.from("coach_profiles").insert(payload);
      if (!error) loadProfileData(user.id); else alert("新增失敗");
    } else {
      const { error } = await supabase.from("coach_profiles").update(payload).eq("id", coach.id);
      if (!error) alert("更新成功"); else alert("更新失敗");
    }
    router.refresh();
  };

  const deleteCoachProfile = async (id: string) => {
    if (!window.confirm("確定刪除此教練名片？")) return;
    if (id.startsWith("new_")) {
      setCoachProfiles(prev => prev.filter(c => c.id !== id));
      return;
    }
    const { error } = await supabase.from("coach_profiles").delete().eq("id", id);
    if (!error) setCoachProfiles(prev => prev.filter(c => c.id !== id));
    router.refresh();
  };

  const toggleDisplaySport = (sportName: string) => {
    setEditForm(prev => {
      let current = [...prev.display_sports];
      if (current.includes(sportName)) current = current.filter(s => s !== sportName);
      else { if (current.length >= 3) current.shift(); current.push(sportName); }
      return { ...prev, display_sports: current };
    });
  };

  const handleOpenSportModal = useCallback((us?: UserSport) => { if (us) { setSelectedSportId(us.sport_id); setSportDynamicData(us.metadata || {}); setEditingUserSportId(us.id); } else { setSelectedSportId(""); setSportDynamicData({}); setEditingUserSportId(null); } setIsSportModalOpen(true); }, []);
  const handleSaveSport = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedSportId || !user) return; if (editingUserSportId) { await supabase.from("user_sports").update({ sport_id: selectedSportId, metadata: sportDynamicData }).eq("id", editingUserSportId); } else { await supabase.from("user_sports").insert({ user_id: user.id, sport_id: selectedSportId, metadata: sportDynamicData }); } await loadProfileData(user.id); setIsSportModalOpen(false); router.refresh(); };
  const handleRemoveSport = async (us: UserSport) => { if (!window.confirm(`確定要移除 ${us.sports?.name} 嗎？`)) return; await supabase.from("user_sports").delete().eq("id", us.id); setUserSports(prev => prev.filter(item => item.id !== us.id)); router.refresh(); };
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const rawFile = e.target.files?.[0]; if (!rawFile || !uploadMediaSport || !user) return; const fileToUpload = await compressImage(rawFile); const uniqueFileName = `highlight-${Date.now()}.${rawFile.name.split(".").pop()}`; const { error } = await supabase.storage.from("highlights").upload(`${user.id}/${uniqueFileName}`, fileToUpload); if (!error) { const publicUrl = supabase.storage.from("highlights").getPublicUrl(`${user.id}/${uniqueFileName}`).data.publicUrl; setGalleryMedia(prev => [{ id: uniqueFileName, sportName: uploadMediaSport, type: "image", url: publicUrl, fileName: uniqueFileName, createdAt: "剛剛" }, ...prev]); } setIsMediaModalOpen(false); setUploadMediaSport(""); router.refresh(); };
  const handleDeleteMedia = async (post: MediaItem) => { if (!user || !post.fileName) return; if (!window.confirm("確定刪除此影像？")) return; await supabase.storage.from("highlights").remove([`${user.id}/${post.fileName}`]); setGalleryMedia(prev => prev.filter(m => m.id !== post.id)); setSelectedPost(null); router.refresh(); };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入總部中...</div>;
  const avatarSrc = editForm.avatar_url || profile?.avatar_url || "";

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton label="返回列表" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 sticky top-20 shadow-2xl">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 shadow-xl overflow-hidden bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }}>{!avatarSrc && (profile?.first_name?.[0] || profile?.full_name?.[0] || "PRO")}</div>
                {isEditing && <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-slate-950/60 rounded-full flex flex-col items-center justify-center text-white text-xs font-bold border border-dashed border-slate-400">📸 換照片</button>}
                <input type="file" ref={avatarInputRef} onChange={onAvatarFileChange} accept="image/*" className="hidden" />
                <div className="absolute -bottom-3 -right-6 z-20"><StatusBadge tag={isEditing ? editForm.status_tag : profile?.status_tag ?? null} /></div>
              </div>

              {isEditing ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">名 First</label><input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">姓 Last</label><input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">Unique Handle</label><input className={`w-full bg-slate-950/50 border rounded-xl p-3 text-white text-sm ${handleStatus === 'taken' ? 'border-red-500' : 'border-slate-800'}`} value={editForm.handle} onChange={e => setEditForm({ ...editForm, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} placeholder="ID 帳號" /></div>
                  <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">Headline</label><input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.headline} onChange={e => setEditForm({ ...editForm, headline: e.target.value })} placeholder="例如: 網球底線玩家" /></div>
                  
                  {/* 💡 現在地點是從資料庫動態產生的 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">國家</label><select className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value, region: "" })}><option value="">選擇國家</option>{Object.keys(locationData).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">地區</label><select className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.region} onChange={e => setEditForm({ ...editForm, region: e.target.value })}><option value="">選擇區域</option>{editForm.country && locationData[editForm.country]?.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  </div>
                  
                  <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">Bio</label><textarea className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm h-24 resize-none" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="訓練哲學..." /></div>

                  <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-4 mt-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold uppercase pl-1 block mb-2">運動員/一般狀態</label>
                      <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs" value={editForm.status_tag} onChange={e => setEditForm(prev => ({ ...prev, status_tag: e.target.value }))}>
                        <option value="recruiting">🟢 尋找新血</option>
                        <option value="seeking_team">🔵 尋找隊伍</option>
                        <option value="open_to_match">🟡 開放約戰</option>
                        <option value="committed">⚪ 穩定狀態</option>
                        <option value="hidden">🔒 未發布 (隱藏中)</option>
                      </select>
                    </div>
                    <div className="pt-3 border-t border-slate-800/80 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.is_coach} onChange={e => setEditForm(prev => ({ ...prev, is_coach: e.target.checked }))} className="rounded bg-slate-900 border-slate-700" /><span className="text-xs font-bold text-amber-400">開啟教練管理功能</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.is_physio} onChange={e => setEditForm(prev => ({ ...prev, is_physio: e.target.checked }))} className="rounded bg-slate-900 border-slate-700" /><span className="text-xs font-bold text-emerald-400">開啟運動/物理治療功能</span></label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button onClick={handleSaveProfile} disabled={isSaving || handleStatus === 'taken'} className="flex-1 bg-slate-50 hover:bg-slate-200 text-black font-black py-3 rounded-xl disabled:opacity-50">{isSaving ? "同步中..." : "完成變更"}</button>
                    <button onClick={() => { setIsEditing(false); if (user) loadProfileData(user.id); }} className="px-4 bg-slate-800 text-zinc-300 font-bold rounded-xl hover:bg-slate-700">取消</button>
                  </div>
                </div>
              ) : (
                <div className="text-center animate-fadeIn mt-2">
                  <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">{profile?.first_name} {profile?.last_name}</h1>
                  <p className="text-sm font-mono text-blue-400 mb-4">@{profile?.handle || "ID_未設定"}</p>
                  <p className="text-sm font-bold text-zinc-400 mb-4">{profile?.headline || "設定你的場上宣言"}</p>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <span className="bg-slate-800/80 text-zinc-300 text-[10px] font-black px-3 py-1 rounded-full border border-slate-700">👤 運動員</span>
                    {profile?.is_coach && <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/20">🎓 教練</span>}
                    {profile?.is_physio && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20">⚕️ 運動/物理治療</span>}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed text-left bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 mb-6">{profile?.bio || "寫下一段關於你的歷程..."}</p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setIsEditing(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">✏️ 編輯基礎檔案與身份</button>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${user?.id}`); alert("名片網址已複製！"); }} className="w-full bg-transparent border border-slate-700 hover:border-slate-500 text-zinc-300 font-bold py-3 rounded-xl transition">分享連結 ↗</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-1 rounded-2xl flex w-full sticky top-16 z-30 mb-8 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {dynamicTabs.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id as TabId)} className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[70px] ${activeTab === t.id ? "bg-slate-50 text-black shadow-lg scale-[1.02]" : "text-zinc-500 hover:text-white hover:bg-slate-800/50"}`}>
                  <span className="text-lg md:text-xl mb-0.5">{t.icon}</span><span className="text-[10px] md:text-xs font-black leading-tight truncate w-full text-center">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1">
            {activeTab === "dashboard" && (
                <div className="space-y-6 animate-fadeIn">
                   {/* 💡 加入 Coming Soon 遮罩 */}
                   <div className="relative group">
                    <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] z-10 rounded-3xl flex items-center justify-center opacity-100 transition-opacity">
                      <div className="bg-slate-900 border border-slate-700 text-white text-sm font-black px-6 py-2 rounded-full shadow-2xl flex items-center gap-2">
                        <span>🚀</span> Coming Soon
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-30 select-none pointer-events-none blur-[1px]">
                      <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl flex flex-col justify-center"><span className="text-zinc-500 text-[10px] font-black tracking-widest mb-1">Total Views</span><span className="text-3xl font-black text-white">--</span></div>
                      <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl flex flex-col justify-center"><span className="text-zinc-500 text-[10px] font-black tracking-widest mb-1">Scout Search</span><span className="text-3xl font-black text-blue-400">--</span></div>
                      <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-500/20 p-5 rounded-3xl flex items-center justify-between">
                        <div><span className="text-indigo-400 text-[10px] font-black tracking-widest block mb-1">Rankings</span><span className="text-xl font-black text-white">即將解鎖</span></div>
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-xl">🔥</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🏆</div>
                    <h3 className="text-white font-bold mb-2">準備好參加賽事了嗎？</h3>
                    <p className="text-zinc-400 text-sm max-w-md mx-auto">完善你的「技術特長」與「賽事影音」，系統將為您智慧推播最合適的職缺。</p>
                  </div>
                </div>
              )}

              {activeTab === "expertise" && (
                <div className="animate-fadeIn space-y-6">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <div><h2 className="text-xl font-black text-white">登錄認證技術特長</h2></div>
                    <button onClick={() => handleOpenSportModal()} className="bg-slate-50 text-black text-xs font-black px-4 py-2.5 rounded-full hover:scale-105">＋ 新增特長</button>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs p-3 rounded-xl mb-4 font-bold flex justify-between items-center">
                    <span>💡 勾選項目將會顯示在 Network 列表卡片上（最多顯示 3 項）</span>
                    <button onClick={handleSaveProfile} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg">儲存顯示設定</button>
                  </div>
                  {userSports.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-700/50 rounded-3xl"><p className="text-zinc-500 text-sm font-bold">空蕩蕩的技術清單... 立即宣告專業項目！</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {userSports.map((us) => (
                        <div key={us.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <span className="text-xl font-black text-white block">{us.sports?.name}</span>
                              <label className="flex items-center gap-2 cursor-pointer bg-slate-950 p-2 rounded-lg border border-slate-800">
                                <input type="checkbox" checked={editForm.display_sports.includes(us.sports?.name || "")} onChange={() => toggleDisplaySport(us.sports?.name || "")} className="rounded" />
                                <span className="text-[10px] text-zinc-400 font-bold">顯示於名片</span>
                              </label>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(us.metadata || {}).map(([key, val]) => (
                                <div key={key} className="flex justify-between text-sm pb-1 border-b border-slate-800/50 last:border-0"><span className="text-zinc-500 font-bold capitalize">{key}</span><span className="text-blue-400 font-black">{val as string}</span></div>
                              ))}
                            </div>
                          </div>
                          <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end gap-3">
                            <button onClick={() => handleOpenSportModal(us)} className="text-blue-400 text-xs font-bold px-3 py-1.5 bg-blue-500/10 rounded-xl">✏️ 編輯</button>
                            <button onClick={() => handleRemoveSport(us)} className="text-red-400 text-xs font-bold px-3 py-1.5 bg-red-500/10 rounded-xl">🗑️ 移除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 其餘 tab 內容... (highlights, feed 保持不變) */}
              {activeTab === "highlights" && (
                <div className="animate-fadeIn space-y-6">
                  <div className="flex flex-wrap justify-between items-end mb-2 px-2 gap-4">
                    <div><h2 className="text-xl font-black text-white">賽場高清圖庫</h2></div>
                    {userSports.length > 0 ? <button onClick={() => setIsMediaModalOpen(true)} className="bg-slate-50 text-black text-xs font-black px-4 py-2.5 rounded-full">📸 上傳高光</button> : <p className="text-xs text-amber-500 font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg">先宣告特長</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {galleryMedia.map(m => (
                      <div key={m.id} onClick={() => setSelectedPost(m)} className="relative group aspect-square overflow-hidden bg-slate-900 cursor-pointer">
                        <img src={m.url} alt={m.sportName} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "feed" && (
                <div className="animate-fadeIn space-y-6 max-w-3xl">
                   <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} /><div><h4 className="text-sm font-black text-white">{profile?.full_name}</h4><span className="text-[10px] text-zinc-500 uppercase">剛剛</span></div></div>
                    <p className="text-sm text-zinc-300 font-medium">持續訓練，準備迎接下一個賽季！目前的技術儲備已經到位，期待能在友誼賽中驗證成果。🔥</p>
                  </div>
                </div>
              )}

              {activeTab === "coach" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-black text-white">教練多重名片設定</h2>
                      <p className="text-xs text-zinc-500 mt-1">您可以針對不同的運動項目，分別發布獨立的教練名片。</p>
                    </div>
                    <button onClick={addCoachProfile} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-black px-4 py-2.5 rounded-full">＋ 新增教練專項</button>
                  </div>

                  {coachProfiles.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-700/50 rounded-3xl"><p className="text-zinc-500 text-sm font-bold">您尚未建立任何教練名片，點擊右上方新增。</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {coachProfiles.map(coach => (
                        <div key={coach.id} className="bg-slate-900/40 border border-amber-500/20 rounded-3xl p-6 relative">
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">指導專項</label>
                              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" value={coach.sport} onChange={e => updateCoachProfile(coach.id, "sport", e.target.value)}>
                                <option value="">-- 選擇專項 --</option>
                                {allSports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {/* 💡 解決了 input 數字無法為空的問題 */}
                              <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">時薪 (HK$)</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" value={coach.rate} placeholder="例如: 500" onChange={e => updateCoachProfile(coach.id, "rate", e.target.value === "" ? "" : Number(e.target.value))} /></div>
                              <div>
                                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">狀態</label>
                                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" value={coach.status} onChange={e => updateCoachProfile(coach.id, "status", e.target.value)}>
                                  <option value="recruiting">🟢 招生中</option>
                                  <option value="full">🔴 滿員</option>
                                  <option value="hidden">🔒 未發布</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">指導國家</label><select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" value={coach.country} onChange={e => updateCoachProfile(coach.id, "country", e.target.value)}><option value="">選擇國家</option>{Object.keys(locationData).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                              <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">指導區域</label><select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" value={coach.region} onChange={e => updateCoachProfile(coach.id, "region", e.target.value)}><option value="">選擇區域</option>{coach.country && locationData[coach.country]?.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-4 mt-4 border-t border-slate-800">
                            <button onClick={() => saveCoachProfile(coach)} className="flex-1 bg-amber-600 text-white font-black py-2 rounded-xl text-sm">儲存/發布這張名片</button>
                            <button onClick={() => deleteCoachProfile(coach.id)} className="px-4 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition text-sm">刪除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "physio" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                  <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl h-fit">
                    <h3 className="text-lg font-black text-white mb-6">設定運動/物理治療名片</h3>
                    <div className="space-y-4">
                      <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">診所/工作室名稱</label><input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.clinic_name || ""} onChange={e => setEditForm({...editForm, clinic_name: e.target.value})} placeholder="例如: 運動復健所" /></div>
                      
                      {/* 💡 解決了 input 數字無法為空的問題 */}
                      <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">單次收費 (HK$)</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" placeholder="例如: 800" value={editForm.physio_rate} onChange={e => setEditForm({...editForm, physio_rate: e.target.value === "" ? "" : Number(e.target.value)})} /></div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">所在國家</label><select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.physio_country} onChange={e => setEditForm({...editForm, physio_country: e.target.value, physio_region: ""})}><option value="">選擇國家</option>{Object.keys(locationData).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">所在區域</label><select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.physio_region} onChange={e => setEditForm({...editForm, physio_region: e.target.value})}><option value="">選擇區域</option>{editForm.physio_country && locationData[editForm.physio_country]?.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">預約狀態</label>
                        <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.physio_status || "hidden"} onChange={e => setEditForm({...editForm, physio_status: e.target.value})}>
                          <option value="available">🟢 開放預約</option>
                          <option value="busy">🔴 滿診中</option>
                          <option value="hidden">🔒 未發布 (隱藏中)</option>
                        </select>
                      </div>
                      <button onClick={handleSaveProfile} disabled={isSaving} className="w-full mt-2 bg-emerald-600 text-white font-black py-3 rounded-xl">{isSaving ? "儲存中..." : "儲存防護設定"}</button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-500 mb-4 px-2">公開列表預覽</h3>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20" />
                      <div className="relative w-20 h-20 mb-5 mt-2"><div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700/50 bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} /><div className="absolute -bottom-3 flex justify-center w-full"><StatusBadge tag={editForm.physio_status} /></div></div>
                      <h3 className="text-lg font-black text-white">{profile?.full_name || "您的名稱"}</h3>
                      <p className="text-xs text-zinc-400 mb-5 line-clamp-2">{editForm.clinic_name || "未登錄診所"}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-4 w-full">
                        <div className="bg-slate-950/50 border border-slate-800 text-zinc-400 text-xs font-bold px-3 py-1.5 rounded-lg truncate max-w-[140px]">📍 {editForm.physio_region ? `${editForm.physio_region}` : "地點未設"}</div>
                        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black px-3 py-1.5 rounded-lg">HK$ {editForm.physio_rate}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 4 個 Modal */}
      {isCropModalOpen && cropImageSrc && (<div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"><div className="relative w-full max-w-md h-[400px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl mb-6"><Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={(_, px) => setCroppedAreaPixels(px as any)} onZoomChange={setZoom} /></div><div className="w-full max-w-md flex gap-4"><button onClick={() => { setIsCropModalOpen(false); setCropImageSrc(null); }} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl">取消</button><button onClick={handleConfirmCrop} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl">確認裁切</button></div></div>)}
      {isSportModalOpen && (<div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn"><div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl"><h3 className="text-lg font-black text-white mb-6">{editingUserSportId ? "編輯技術特長" : "添入技術特長"}</h3><form onSubmit={handleSaveSport} className="space-y-5 text-sm"><div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">選擇運動項目</label><select value={selectedSportId} onChange={e => { setSelectedSportId(e.target.value); setSportDynamicData({}); }} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-bold outline-none" required><option value="">-- 選擇項目 --</option>{allSports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>{allSports.find(s => s.id === selectedSportId) && (SPORT_SCHEMA[allSports.find(s => s.id === selectedSportId)!.name] || SPORT_SCHEMA["default"]).map(field => (<div key={field.key} className="animate-fadeIn"><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">{field.label}</label>{field.type === "select" ? (<select value={sportDynamicData[field.key] || ""} onChange={e => setSportDynamicData({ ...sportDynamicData, [field.key]: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white font-bold outline-none" required><option value="">-- 請選擇 --</option>{field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>) : (<input type={field.type} value={sportDynamicData[field.key] || ""} onChange={e => setSportDynamicData({ ...sportDynamicData, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white font-bold outline-none" required />)}</div>))}<div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsSportModalOpen(false)} className="flex-1 bg-slate-900 text-zinc-400 font-bold py-3 rounded-xl">取消</button><button type="submit" disabled={!selectedSportId} className="flex-1 bg-slate-50 text-black font-black py-3 rounded-xl">{editingUserSportId ? "儲存" : "加入"}</button></div></form></div></div>)}
      {isMediaModalOpen && (<div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn"><div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl"><h3 className="text-lg font-black text-white mb-6">歸檔雲端賽事影音</h3><div className="space-y-5 text-sm"><div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">1. 歸屬類別</label><select value={uploadMediaSport} onChange={e => setUploadMediaSport(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-bold outline-none"><option value="">-- 選擇專長 --</option>{userSports.map(us => <option key={us.id} value={us.sports?.name}>{us.sports?.name}</option>)}</select></div><div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">2. 選擇檔案</label><div className="border-2 border-dashed border-slate-800 hover:border-slate-600 transition rounded-xl p-4 text-center cursor-pointer relative overflow-hidden"><input type="file" ref={mediaInputRef} onChange={handleMediaUpload} accept="image/*" disabled={!uploadMediaSport || isUploadingMedia} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" /><span className="text-zinc-400 font-bold block">{isUploadingMedia ? "雲端推流中..." : uploadMediaSport ? "點擊選擇照片" : "請先選擇上方類別"}</span></div></div><button onClick={() => setIsMediaModalOpen(false)} className="w-full bg-slate-900 text-zinc-400 font-bold py-3 rounded-xl mt-2">關閉視窗</button></div></div></div>)}
      {selectedPost && (<div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-0 md:p-8 animate-fadeIn"><button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 md:top-6 md:right-6 text-white text-3xl font-black z-50 hover:scale-110">×</button><div className="w-full max-w-6xl max-h-[100dvh] md:max-h-[85vh] bg-slate-950 md:rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-800 shadow-2xl"><div className="w-full md:w-3/5 bg-black flex items-center justify-center min-h-[40vh] md:min-h-0"><img src={selectedPost.url} alt="Post highlight" className="max-w-full max-h-[85vh] object-contain" /></div><div className="w-full md:w-2/5 flex flex-col h-[60vh] md:h-full bg-slate-950"><div className="p-4 border-b border-slate-800 flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-700 bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} /><div><p className="text-sm font-black text-white">{profile?.handle || profile?.first_name}</p></div></div><button onClick={() => handleDeleteMedia(selectedPost)} className="text-red-400 text-xs font-bold px-3 py-1.5 bg-red-500/10 rounded-lg">刪除</button></div><div className="flex-1 p-4" /></div></div></div>)}
    </div>
  );
}

export default dynamic(() => Promise.resolve(ProfilePageContent), { ssr: false });
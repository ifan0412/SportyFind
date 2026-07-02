"use client";

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Cropper from "react-easy-crop";
import { BackButton } from "@/components/BackButton";
import { FriendsTab } from "@/components/FriendsTab";
import { DashboardTab } from "@/components/profile/DashboardTab";
import { FeedTab } from "@/components/profile/FeedTab";
import { ExpertiseTab } from "@/components/profile/ExpertiseTab";
import { HighlightsTab } from "@/components/profile/HighlightsTab";
import { CoachTab } from "@/components/profile/CoachTab";
import { PhysioTab } from "@/components/profile/PhysioTab";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string; full_name: string | null; first_name: string | null; last_name: string | null; handle: string | null; headline: string | null; bio: string | null; location: string | null; country: string | null; region: string | null; avatar_url: string | null; status_tag: string | null; display_sports: string[] | null;
  
  // Coach specific
  is_coach: boolean | null;
  contact_email: string | null;      // NEW
  contact_phone: string | null;      // NEW
  address: string | null;            // NEW
  city_region: string | null;        // NEW
  is_address_public: boolean | null; // NEW

  // Physio specific
  is_physio: boolean | null; 
  physio_rate: number | string; 
  clinic_name: string | null; 
  physio_status: string | null; 
  physio_country: string | null; 
  physio_region: string | null;
}
interface CoachProfile { id: string; sport: string; rate: number | string; status: string; country: string; region: string; }
interface Sport { id: string; name: string; }
interface UserSport { id: string; sport_id: string; metadata: { position?: string; [key: string]: any }; sports: { name: string } | null; }
interface MediaItem { id: string; sportName: string; type: "image" | "video"; url: string; fileName?: string; createdAt: string; }
type TabId = "dashboard" | "expertise" | "highlights" | "feed" | "coach" | "physio" | "friends";
type FieldDef = { key: string; label: string; type: "select" | "text" | "number"; options?: string[]; placeholder?: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORT_SCHEMA: Record<string, FieldDef[]> = {
  "Basketball": [{ key: "position", label: "場上定位", type: "select", options: ["PG 控球後衛", "SG 得分後衛", "SF 小前鋒", "PF 大前鋒", "C 中鋒"] }, { key: "dominant_hand", label: "慣用手", type: "select", options: ["右手", "左手", "雙手皆可"] }],
  "Tennis": [{ key: "level", label: "NTRP 級別", type: "select", options: ["3.0", "3.5", "4.0", "4.5", "5.0", "5.5+"] }, { key: "dominant_hand", label: "持拍手", type: "select", options: ["右手 (單反)", "右手 (雙反)", "左手 (單反)", "左手 (雙反)"] }, { key: "preference", label: "打法偏好", type: "select", options: ["底線防守", "底線攻擊", "發球上網", "全場型"] }],
  "Volleyball": [{ key: "position", label: "場上定位", type: "select", options: ["主攻手 (OH)", "副攻手 (OPP)", "快攻手 (MB)", "舉球員 (S)", "自由球員 (L)"] }, { key: "reach_height", label: "最高打點 (cm)", type: "number", placeholder: "例如: 310" }],
  "default": [{ key: "experience", label: "球齡或簡述", type: "text", placeholder: "例如: 5年經驗..." }]
};

const DEFAULT_FORM = {
  first_name: "", last_name: "", handle: "", full_name: "", headline: "", location: "", country: "", region: "", bio: "", avatar_url: "", status_tag: "committed", display_sports: [] as string[],
  
  // Coach specific defaults
  is_coach: false, 
  contact_email: "",       // NEW
  contact_phone: "",       // NEW
  address: "",             // NEW
  city_region: "",         // NEW
  is_address_public: true, // NEW

  // Physio specific defaults
  is_physio: false, 
  physio_rate: "" as number | string, 
  clinic_name: "", 
  physio_status: "hidden", 
  physio_country: "", 
  physio_region: ""
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const compressImage = (file: File | Blob): Promise<File | Blob> => new Promise((resolve) => { if (file.size <= 1.5 * 1024 * 1024) return resolve(file); const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { const MAX = 1200; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } } else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } } const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; const ctx = canvas.getContext("2d"); if (!ctx) return resolve(file); ctx.drawImage(img, 0, 0, w, h); canvas.toBlob((blob) => resolve(blob ? new File([blob], file instanceof File ? file.name : "cropped.jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.8); }; img.src = e.target?.result as string; }; reader.readAsDataURL(file); });
const createImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => { const image = new Image(); image.addEventListener("load", () => resolve(image)); image.addEventListener("error", (error) => reject(error)); image.src = url; });
const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => { const image = await createImage(imageSrc); const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); if (!ctx) return null; canvas.width = pixelCrop.width; canvas.height = pixelCrop.height; ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height); return new Promise((resolve) => { canvas.toBlob((file) => resolve(file), "image/jpeg"); }); };

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ tag }: { tag: string | null }) => {
  if (tag === "hidden" || tag === "draft") return <div className="inline-flex items-center gap-1.5 bg-slate-800 text-zinc-500 text-[10px] px-2.5 py-1 rounded-full font-black border border-slate-700">🔒 未發布 (隱藏中)</div>;
  if (tag === "recruiting") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 招生/招募中</div>;
  if (tag === "seeking_team") return <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> 尋找隊伍</div>;
  if (tag === "open_to_match") return <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> 開放約戰</div>;
  if (tag === "available") return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 開放預約</div>;
  if (tag === "busy" || tag === "full") return <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> 滿員/滿診</div>;
  return <div className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> 穩定狀態</div>;
};

// ─── Main Component ───────────────────────────────────────────────────────────
function ProfilePageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); // 用於手機版平滑滾動定位
  const pendingAvatarFile = useRef<File | Blob | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coachProfiles, setCoachProfiles] = useState<CoachProfile[]>([]);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 預設 Tab 變更為公開的 expertise
  const [activeTab, setActiveTab] = useState<TabId>("expertise");
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
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);
  const [selectedPost, setSelectedPost] = useState<MediaItem | null>(null);

  // 重構 publicTabs，將後台管理的 Tab 移出
  const publicTabs = useMemo(() => {
    const base: { id: TabId; icon: string; label: string; en: string }[] = [
      { id: "expertise", icon: "📋", label: "技術特長", en: "Expertise" },
      { id: "highlights", icon: "🎞️", label: "賽場圖庫", en: "Highlights" },
      { id: "feed", icon: "📰", label: "個人動態", en: "Feed" },
    ];
    if (profile?.is_coach || editForm.is_coach) base.push({ id: "coach", icon: "🎓", label: "教練設定", en: "Coach" });
    if (profile?.is_physio || editForm.is_physio) base.push({ id: "physio", icon: "⚕️", label: "治療設定", en: "Physio" });
    return base;
  }, [profile?.is_coach, profile?.is_physio, editForm.is_coach, editForm.is_physio]);

  // 新增一個共用的切換 Tab 函數，處理手機版滾動
  const handleTabSwitch = useCallback((tab: TabId) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024 && contentRef.current) {
      const y = contentRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  const loadProfileData = useCallback(async (userId: string) => {
    try {
      const [{ data: prof }, { data: usData }, { data: sData }, { data: coachesData }, { data: locData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("user_sports").select("id, sport_id, metadata, sports(name)").eq("user_id", userId),
        supabase.from("sports").select("*").order("name", { ascending: true }),
        supabase.from("coach_profiles").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
        supabase.from("locations").select("country, region")
      ]);
      if (locData) {
        const locMap: Record<string, string[]> = {};
        locData.forEach(item => { if (!locMap[item.country]) locMap[item.country] = []; if (!locMap[item.country].includes(item.region)) locMap[item.country].push(item.region); });
        setLocationData(locMap);
      }
      if (prof) {
        setProfile(prof);
        setEditForm({ 
          first_name: prof.first_name ?? "", 
          last_name: prof.last_name ?? "", 
          handle: prof.handle ?? "", 
          full_name: prof.full_name ?? "", 
          headline: prof.headline ?? "", 
          location: prof.location ?? "", 
          country: prof.country ?? "", 
          region: prof.region ?? "", 
          bio: prof.bio ?? "", 
          avatar_url: prof.avatar_url ?? "", 
          status_tag: prof.status_tag ?? "committed", 
          display_sports: prof.display_sports ?? [], 
          
          is_coach: prof.is_coach ?? false, 
          contact_email: prof.contact_email ?? "",             // NEW
          contact_phone: prof.contact_phone ?? "",             // NEW
          address: prof.address ?? "",                         // NEW
          city_region: prof.city_region ?? "",                 // NEW
          is_address_public: prof.is_address_public ?? true,   // NEW

          is_physio: prof.is_physio ?? false, 
          physio_rate: prof.physio_rate === 0 ? "" : (prof.physio_rate ?? ""), 
          clinic_name: prof.clinic_name ?? "", 
          physio_status: prof.physio_status ?? "hidden", 
          physio_country: prof.physio_country ?? "", 
          physio_region: prof.physio_region ?? "" 
        });
      }
      if (usData) setUserSports(usData as unknown as UserSport[]);
      if (sData) setAllSports(sData);
      if (coachesData) setCoachProfiles(coachesData.map(c => ({ ...c, rate: c.rate === 0 ? "" : c.rate })));
      const { data: files } = await supabase.storage.from("highlights").list(`${userId}/`, { limit: 20, sortBy: { column: "created_at", order: "desc" } });
      if (files && files.length > 0) {
        setGalleryMedia(files.filter(f => f.name !== ".emptyFolderPlaceholder").map(file => { const { data: urlData } = supabase.storage.from("highlights").getPublicUrl(`${userId}/${file.name}`); return { id: file.id || file.name, sportName: "Highlight", type: "image" as const, url: urlData.publicUrl, fileName: file.name, createdAt: file.created_at ? new Date(file.created_at).toLocaleDateString() : "最近上傳" }; }));
      } else setGalleryMedia([]);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) { setUser(authUser); loadProfileData(authUser.id); } else setIsLoading(false);
    });
  }, [loadProfileData, supabase]);

  useEffect(() => {
    if (searchParams.get("tab") === "friends") handleTabSwitch("friends");
  }, [searchParams, handleTabSwitch]);

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

    // ✅ 新增：原生的確認彈出視窗 (Confirm Pop-up)
    if (!window.confirm("確定要儲存您的個人檔案與專業資訊變更嗎？")) {
      return; 
    }

    setIsSaving(true);
    let finalAvatarUrl = editForm.avatar_url;
    if (pendingAvatarFile.current) {
      const filePath = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, pendingAvatarFile.current, { upsert: true });
      if (!uploadError) finalAvatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
      pendingAvatarFile.current = null; 
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    }
    
    const fullName = `${editForm.first_name} ${editForm.last_name}`.trim();
    const physioRateVal = Number(editForm.physio_rate) || 0;

    // 🎯 👇 這整塊就是你的 upsert 區塊 👇 🎯
    const { error } = await supabase.from("profiles").upsert({ 
      id: user.id, 
      first_name: editForm.first_name, 
      last_name: editForm.last_name, 
      handle: editForm.handle, 
      full_name: fullName, 
      headline: editForm.headline, 
      country: editForm.country, 
      region: editForm.region, 
      location: editForm.region ? `${editForm.region}, ${editForm.country}` : editForm.country, 
      bio: editForm.bio, 
      avatar_url: finalAvatarUrl, 
      status_tag: editForm.status_tag, 
      display_sports: editForm.display_sports, 
      
      // ── 教練相關資訊 ──
      is_coach: editForm.is_coach, 
      contact_email: editForm.contact_email || null,             
      contact_phone: editForm.contact_phone || null,             
      address: editForm.address || null,                         
      city_region: editForm.city_region || null,                 
      is_address_public: editForm.is_address_public ?? true,     
      instagram_url: editForm.instagram_url || null,
      facebook_url: editForm.facebook_url || null,
      threads_url: editForm.threads_url || null,

      // ── 防護員基礎與專業經歷資訊 ──
      is_physio: editForm.is_physio, 
      physio_rate: physioRateVal, 
      clinic_name: editForm.clinic_name || null, 
      physio_status: editForm.physio_status || "hidden", 
      physio_country: editForm.physio_country || null, 
      physio_region: editForm.physio_region || null,
      physio_experience_years: editForm.physio_experience_years || null,
      physio_qualifications: editForm.physio_qualifications || null,
      physio_services_offered: editForm.physio_services_offered || null,

      // ── ✅ 這裡就是新加入的：防護員獨立聯絡與社群資訊 ──
      physio_contact_email: editForm.physio_contact_email || null,
      physio_contact_phone: editForm.physio_contact_phone || null,
      physio_city_region: editForm.physio_city_region || null,
      physio_address: editForm.physio_address || null,
      physio_is_address_public: editForm.physio_is_address_public ?? true,
      physio_instagram_url: editForm.physio_instagram_url || null,
      physio_facebook_url: editForm.physio_facebook_url || null,
      physio_threads_url: editForm.physio_threads_url || null,
    });
    // 🎯 👆 upsert 區塊結束 👆 🎯

    if (!error) {
      setProfile(prev => ({ ...prev!, ...editForm, avatar_url: finalAvatarUrl, full_name: fullName, location: `${editForm.region}, ${editForm.country}` }));
      setIsEditing(false); 
      
      // 成功時給予提示彈窗
      alert("✅ 儲存成功！您的個人資料與專業名片已更新。");
      
      router.refresh();
      if (editForm.is_coach && !profile?.is_coach) handleTabSwitch("coach");
      else if (editForm.is_physio && !profile?.is_physio) handleTabSwitch("physio");
    } else {
      console.error("Save Error:", error);
      alert("❌ 同步失敗，請開啟瀏覽器主控台 (F12 Console) 檢查錯誤詳情。");
    }
    setIsSaving(false);
  };

  const addCoachProfile = () => setCoachProfiles(prev => [...prev, { id: `new_${Date.now()}`, sport: "", rate: "", status: "hidden", country: "", region: "" }]);
  const updateCoachProfile = (id: string, field: string, value: any) => setCoachProfiles(prev => prev.map(c => c.id === id ? { ...c, [field as keyof CoachProfile]: value } : c));
  const saveCoachProfile = async (coach: CoachProfile) => {
    if (!user || !coach.sport) return alert("請選擇專項");
    const isNew = coach.id.startsWith("new_");
    const payload = { user_id: user.id, sport: coach.sport, rate: Number(coach.rate) || 0, status: coach.status, country: coach.country, region: coach.region };
    if (isNew) { const { error } = await supabase.from("coach_profiles").insert(payload); if (!error) loadProfileData(user.id); else alert("新增失敗"); }
    else { const { error } = await supabase.from("coach_profiles").update(payload).eq("id", coach.id); if (!error) alert("更新成功"); else alert("更新失敗"); }
    router.refresh();
  };
  const deleteCoachProfile = async (id: string) => {
    if (!window.confirm("確定刪除此教練名片？")) return;
    if (id.startsWith("new_")) { setCoachProfiles(prev => prev.filter(c => c.id !== id)); return; }
    const { error } = await supabase.from("coach_profiles").delete().eq("id", id);
    if (!error) setCoachProfiles(prev => prev.filter(c => c.id !== id));
    router.refresh();
  };

  const toggleDisplaySport = (sportName: string) => {
    setEditForm(prev => { let current = [...prev.display_sports]; if (current.includes(sportName)) current = current.filter(s => s !== sportName); else { if (current.length >= 3) current.shift(); current.push(sportName); } return { ...prev, display_sports: current }; });
  };

  const handleOpenSportModal = useCallback((us?: UserSport) => {
    if (us) { setSelectedSportId(us.sport_id); setSportDynamicData(us.metadata || {}); setEditingUserSportId(us.id); }
    else { setSelectedSportId(""); setSportDynamicData({}); setEditingUserSportId(null); }
    setIsSportModalOpen(true);
  }, []);

  const handleSaveSport = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedSportId || !user) return;
    if (editingUserSportId) await supabase.from("user_sports").update({ sport_id: selectedSportId, metadata: sportDynamicData }).eq("id", editingUserSportId);
    else await supabase.from("user_sports").insert({ user_id: user.id, sport_id: selectedSportId, metadata: sportDynamicData });
    await loadProfileData(user.id); setIsSportModalOpen(false); router.refresh();
  };

  const handleRemoveSport = async (us: UserSport) => {
    if (!window.confirm(`確定要移除 ${us.sports?.name} 嗎？`)) return;
    await supabase.from("user_sports").delete().eq("id", us.id);
    setUserSports(prev => prev.filter(item => item.id !== us.id)); router.refresh();
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0]; if (!rawFile || !uploadMediaSport || !user) return;
    setIsUploadingMedia(true);
    const fileToUpload = await compressImage(rawFile);
    const uniqueFileName = `highlight-${Date.now()}.${rawFile.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("highlights").upload(`${user.id}/${uniqueFileName}`, fileToUpload);
    if (!error) { const publicUrl = supabase.storage.from("highlights").getPublicUrl(`${user.id}/${uniqueFileName}`).data.publicUrl; setGalleryMedia(prev => [{ id: uniqueFileName, sportName: uploadMediaSport, type: "image", url: publicUrl, fileName: uniqueFileName, createdAt: "剛剛" }, ...prev]); }
    setIsMediaModalOpen(false); setUploadMediaSport(""); setIsUploadingMedia(false); router.refresh();
  };

  const handleDeleteMedia = async (post: MediaItem) => {
    if (!user || !post.fileName) return; if (!window.confirm("確定刪除此影像？")) return;
    await supabase.storage.from("highlights").remove([`${user.id}/${post.fileName}`]);
    setGalleryMedia(prev => prev.filter(m => m.id !== post.id)); setSelectedPost(null); router.refresh();
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入總部中...</div>;
  const avatarSrc = editForm.avatar_url || profile?.avatar_url || "";

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-blue-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton label="返回首頁" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">

          {/* ── Sidebar ── */}
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
                  <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">Unique Handle</label><input className={`w-full bg-slate-950/50 border rounded-xl p-3 text-white text-sm ${handleStatus === "taken" ? "border-red-500" : "border-slate-800"}`} value={editForm.handle} onChange={e => setEditForm({ ...editForm, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} placeholder="ID 帳號" /></div>
                  <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">Headline</label><input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.headline} onChange={e => setEditForm({ ...editForm, headline: e.target.value })} placeholder="例如: 網球底線玩家" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">國家</label><select className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value, region: "" })}><option value="">選擇國家</option>{Object.keys(locationData).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">地區</label><select className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm" value={editForm.region} onChange={e => setEditForm({ ...editForm, region: e.target.value })}><option value="">選擇區域</option>{editForm.country && locationData[editForm.country]?.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  </div>
                  <div className="space-y-1"><label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">Bio</label><textarea className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm h-24 resize-none" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="訓練哲學..." /></div>
                  <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-4 mt-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold uppercase pl-1 block mb-2">運動員/一般狀態</label>
                      <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs" value={editForm.status_tag} onChange={e => setEditForm(prev => ({ ...prev, status_tag: e.target.value }))}>
                        <option value="recruiting">🟢 尋找新血</option><option value="seeking_team">🔵 尋找隊伍</option><option value="open_to_match">🟡 開放約戰</option><option value="committed">⚪ 穩定狀態</option><option value="hidden">🔒 未發布 (隱藏中)</option>
                      </select>
                    </div>
                    <div className="pt-3 border-t border-slate-800/80 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.is_coach} onChange={e => setEditForm(prev => ({ ...prev, is_coach: e.target.checked }))} className="rounded bg-slate-900 border-slate-700" /><span className="text-xs font-bold text-amber-400">開啟教練管理功能</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.is_physio} onChange={e => setEditForm(prev => ({ ...prev, is_physio: e.target.checked }))} className="rounded bg-slate-900 border-slate-700" /><span className="text-xs font-bold text-emerald-400">開啟運動/物理治療功能</span></label>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button onClick={handleSaveProfile} disabled={isSaving || handleStatus === "taken"} className="flex-1 bg-slate-50 hover:bg-slate-200 text-black font-black py-3 rounded-xl disabled:opacity-50">{isSaving ? "同步中..." : "完成變更"}</button>
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
                    {profile?.is_physio && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20">⚕️ 物理治療</span>}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed text-left bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 mb-6">{profile?.bio || "寫下一段關於你的歷程..."}</p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setIsEditing(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">✏️ 編輯基礎檔案與身份</button>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${user?.id}`); alert("名片網址已複製！"); }} className="w-full bg-transparent border border-slate-700 hover:border-slate-500 text-zinc-300 font-bold py-3 rounded-xl transition">分享連結 ↗</button>
                  </div>
                  
                  {/* ─── Private Management Section (New) ─── */}
                  <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider pl-1 text-left">專屬後台</p>
                    <button
                      onClick={() => handleTabSwitch("dashboard")}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition ${activeTab === "dashboard" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-900/50 text-zinc-400 hover:bg-slate-800 hover:text-white"}`}
                    >
                      <span className="flex items-center gap-3"><span className="text-lg">📊</span> 數據後台</span>
                      <span className="text-xs">→</span>
                    </button>
                    <button
                      onClick={() => handleTabSwitch("friends")}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition ${activeTab === "friends" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-900/50 text-zinc-400 hover:bg-slate-800 hover:text-white"}`}
                    >
                      <span className="flex items-center gap-3"><span className="text-lg">👥</span> 好友管理</span>
                      <span className="text-xs">→</span>
                    </button>
                  </div>
                  
                </div>
              )}
            </div>
          </div>

          {/* ── Tab Area (Right/Main Column) ── */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col" ref={contentRef}>
            
            {/* 判斷目前是否處於私密後台 Tab */}
            {(() => {
              const isPrivateTab = ["dashboard", "friends"].includes(activeTab);
              
              if (isPrivateTab) {
                return (
                  <div className="bg-slate-900 border border-slate-800 p-3 md:p-4 rounded-2xl flex items-center justify-between w-full mb-8 shadow-sm">                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl">
                        {activeTab === "dashboard" ? "📊" : "👥"}
                      </div>
                      <div>
                        <h2 className="text-sm md:text-base font-black text-white leading-tight">
                          {activeTab === "dashboard" ? "數據後台" : "好友管理"}
                        </h2>
                        <p className="text-[10px] text-zinc-400 font-bold tracking-wider mt-0.5">專屬私密空間</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTabSwitch("expertise")}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-zinc-300 hover:text-white text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="hidden sm:inline">返回公開檔案</span>
                      <span className="sm:hidden">返回</span> ↗
                    </button>
                  </div>
                );
              }

              return (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-1 rounded-2xl flex w-full sticky top-16 z-30 mb-8 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {publicTabs.map((t) => (
                    <button key={t.id} onClick={() => handleTabSwitch(t.id as TabId)} className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[70px] ${activeTab === t.id ? "bg-slate-50 text-black shadow-lg scale-[1.02]" : "text-zinc-500 hover:text-white hover:bg-slate-800/50"}`}>
                      <span className="text-lg md:text-xl mb-0.5">{t.icon}</span>
                      <span className="text-[10px] md:text-xs font-black leading-tight truncate w-full text-center">{t.label}</span>
                    </button>
                  ))}
                </div>
              );
            })()}

            <div className="flex-1">
              {/* 下面的各個 Tab 內容維持完全不變... */}
              {activeTab === "dashboard" && <DashboardTab profile={profile} avatarSrc={avatarSrc} />}
              {/* ... 其他 Tabs ... */}

              {activeTab === "expertise" && (
                <ExpertiseTab
                  userSports={userSports}
                  editFormDisplaySports={editForm.display_sports}
                  onToggleDisplaySport={toggleDisplaySport}
                  onOpenSportModal={handleOpenSportModal}
                  onRemoveSport={handleRemoveSport}
                  onSaveDisplaySports={handleSaveProfile}
                />
              )}

              {activeTab === "highlights" && (
                <HighlightsTab
                  galleryMedia={galleryMedia}
                  userSports={userSports}
                  onSelectPost={setSelectedPost}
                  onOpenMediaModal={() => setIsMediaModalOpen(true)}
                />
              )}

              {activeTab === "feed" && <FeedTab profile={profile} avatarSrc={avatarSrc} />}

              {activeTab === "friends" && user && (
                <div className="animate-fadeIn">
                  <div className="mb-6 px-2">
                    <h2 className="text-lg md:text-xl font-black text-white">好友管理</h2>
                    <p className="text-xs text-zinc-500 mt-1">管理你的好友、待接受請求與已發送請求。</p>
                  </div>
                  <FriendsTab currentUserId={user.id} />
                </div>
              )}

              {activeTab === "coach" && (
                <CoachTab
                  coachProfiles={coachProfiles}
                  allSports={allSports}
                  locationData={locationData}
                  editForm={editForm}
                  onFieldChange={(field, value) => setEditForm(prev => ({ ...prev, [field]: value }))}
                  
                  // 👇 就是缺了這兩行！把它們補上去！ 👇
                  onSaveGlobal={handleSaveProfile}
                  isSaving={isSaving}
                  // 👆 👆 👆 👆 👆 👆 👆 👆 👆 👆
                  
                  onAdd={addCoachProfile}
                  onUpdate={updateCoachProfile}
                  onSave={saveCoachProfile}
                  onDelete={deleteCoachProfile}
                />
              )}
{activeTab === "physio" && (
                <PhysioTab
                  editForm={editForm}
                  locationData={locationData}
                  isSaving={isSaving}
                  avatarSrc={avatarSrc}
                  profile={profile}
                  onFieldChange={(field, value) => setEditForm(prev => ({ ...prev, [field]: value }))}
                  
                  // 👇 關鍵修正：把 onSave 改成 onSaveGlobal
                  onSaveGlobal={handleSaveProfile}
                  
                />
              )}

              {activeTab === "physio" && (
                <PhysioTab
                  editForm={editForm}
                  locationData={locationData}
                  isSaving={isSaving}
                  avatarSrc={avatarSrc}
                  profile={profile}
                  onFieldChange={(field, value) => setEditForm(prev => ({ ...prev, [field]: value }))}
                  
                  // 👇 關鍵修正：把 onSave 改成 onSaveGlobal
                  onSaveGlobal={handleSaveProfile}
                  
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {isCropModalOpen && cropImageSrc && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md h-[400px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl mb-6">
            <Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={(_, px) => setCroppedAreaPixels(px as any)} onZoomChange={setZoom} />
          </div>
          <div className="w-full max-w-md flex gap-4">
            <button onClick={() => { setIsCropModalOpen(false); setCropImageSrc(null); }} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl">取消</button>
            <button onClick={handleConfirmCrop} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl">確認裁切</button>
          </div>
        </div>
      )}

      {isSportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">{editingUserSportId ? "編輯技術特長" : "添入技術特長"}</h3>
            <form onSubmit={handleSaveSport} className="space-y-5 text-sm">
              <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">選擇運動項目</label><select value={selectedSportId} onChange={e => { setSelectedSportId(e.target.value); setSportDynamicData({}); }} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-bold outline-none" required><option value="">-- 選擇項目 --</option>{allSports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              {allSports.find(s => s.id === selectedSportId) && (SPORT_SCHEMA[allSports.find(s => s.id === selectedSportId)!.name] || SPORT_SCHEMA["default"]).map(field => (
                <div key={field.key} className="animate-fadeIn">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">{field.label}</label>
                  {field.type === "select"
                    ? <select value={sportDynamicData[field.key] || ""} onChange={e => setSportDynamicData({ ...sportDynamicData, [field.key]: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white font-bold outline-none" required><option value="">-- 請選擇 --</option>{field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                    : <input type={field.type} value={sportDynamicData[field.key] || ""} onChange={e => setSportDynamicData({ ...sportDynamicData, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-white font-bold outline-none" required />
                  }
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsSportModalOpen(false)} className="flex-1 bg-slate-900 text-zinc-400 font-bold py-3 rounded-xl">取消</button>
                <button type="submit" disabled={!selectedSportId} className="flex-1 bg-slate-50 text-black font-black py-3 rounded-xl">{editingUserSportId ? "儲存" : "加入"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMediaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">歸檔雲端賽事影音</h3>
            <div className="space-y-5 text-sm">
              <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">1. 歸屬類別</label><select value={uploadMediaSport} onChange={e => setUploadMediaSport(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white font-bold outline-none"><option value="">-- 選擇專長 --</option>{userSports.map(us => <option key={us.id} value={us.sports?.name}>{us.sports?.name}</option>)}</select></div>
              <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">2. 選擇檔案</label>
                <div className="border-2 border-dashed border-slate-800 hover:border-slate-600 transition rounded-xl p-4 text-center cursor-pointer relative overflow-hidden">
                  <input type="file" ref={mediaInputRef} onChange={handleMediaUpload} accept="image/*" disabled={!uploadMediaSport || isUploadingMedia} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                  <span className="text-zinc-400 font-bold block">{isUploadingMedia ? "雲端推流中..." : uploadMediaSport ? "點擊選擇照片" : "請先選擇上方類別"}</span>
                </div>
              </div>
              <button onClick={() => setIsMediaModalOpen(false)} className="w-full bg-slate-900 text-zinc-400 font-bold py-3 rounded-xl mt-2">關閉視窗</button>
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-0 md:p-8 animate-fadeIn">
          <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 md:top-6 md:right-6 text-white text-3xl font-black z-50 hover:scale-110">×</button>
          <div className="w-full max-w-6xl max-h-[100dvh] md:max-h-[85vh] bg-slate-950 md:rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-800 shadow-2xl">
            <div className="w-full md:w-3/5 bg-black flex items-center justify-center min-h-[40vh] md:min-h-0"><img src={selectedPost.url} alt="Post highlight" className="max-w-full max-h-[85vh] object-contain" /></div>
            <div className="w-full md:w-2/5 flex flex-col h-[60vh] md:h-full bg-slate-950">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-700 bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} /><div><p className="text-sm font-black text-white">{profile?.handle || profile?.first_name}</p></div></div>
                <button onClick={() => handleDeleteMedia(selectedPost)} className="text-red-400 text-xs font-bold px-3 py-1.5 bg-red-500/10 rounded-lg">刪除</button>
              </div>
              <div className="flex-1 p-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfilePageWithSuspense() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入中...</div>}>
      <ProfilePageContent />
    </Suspense>
  );
}

export default dynamic(() => Promise.resolve(ProfilePageWithSuspense), { ssr: false });
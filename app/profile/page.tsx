"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ==========================================
// 1. 全域型別結構宣告 (嚴格對齊百萬級底層藍圖)
// ==========================================
interface Profile {
  id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
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
  metadata: {
    position?: string;
    [key: string]: any;
  };
  sports: {
    name: string;
  } | null;
}

interface MediaItem {
  id: string;
  sportName: string;
  type: "image" | "video";
  url: string;
  createdAt: string;
}

function ProfilePageContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // 核心資料狀態
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSports, setUserSports] = useState<UserSport[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UX 狀態：採用成熟體育產業語彙
  const [activeTab, setActiveTab] = useState<"dashboard" | "arsenal" | "highlights" | "feed">("dashboard");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    headline: "",
    location: "",
    bio: "",
    avatar_url: "",
    is_coach: false,
    coach_rate: 0,
    status_tag: "inactive"
  });

  // Modals 與互動控制狀態
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [selectedSportId, setSelectedSportId] = useState("");
  const [isSubmittingSport, setIsSubmittingSport] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [uploadMediaSport, setUploadMediaSport] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // 預設賽事影音圖庫庫存
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([
    { id: "m-1", sportName: "Volleyball", type: "image", url: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=600&auto=format&fit=crop", createdAt: "2天前" },
    { id: "m-2", sportName: "Volleyball", type: "image", url: "https://images.unsplash.com/photo-1592656094267-764a45160876?q=80&w=600&auto=format&fit=crop", createdAt: "1週前" },
    { id: "m-3", sportName: "Training", type: "image", url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop", createdAt: "2週前" }
  ]);

  // ==========================================
  // 2. 智慧型前端相片無感壓縮引擎 (Natively Compressed)
  // ==========================================
  const compressImageInline = (file: File): Promise<File | Blob> => {
    return new Promise((resolve) => {
      if (file.size <= 1.5 * 1024 * 1024) {
        resolve(file); // 小於 1.5MB 則不浪費 CPU 算力，直接放行
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const max_size = 1200; // 限制最大邊長，兼顧清晰度與傳輸速度

          if (width > height) {
            if (width > max_size) { height *= max_size / width; width = max_size; }
          } else {
            if (height > max_size) { width *= max_size / height; height = max_size; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: "image/jpeg" }));
              } else {
                resolve(file);
              }
            }, "image/jpeg", 0.75); // 壓縮至 75% 品質，體積可暴減 80%
          } else {
            resolve(file);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // ==========================================
  // 3. 資料載入區 (嚴格防彈)
  // ==========================================
  const loadProfileData = async (userId: string) => {
    try {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (prof) {
        setProfile(prof);
        setEditForm({
          full_name: prof.full_name || "",
          headline: prof.headline || "",
          location: prof.location || "",
          bio: prof.bio || "",
          avatar_url: prof.avatar_url || "",
          is_coach: prof.is_coach || false,
          coach_rate: prof.coach_rate || 0,
          status_tag: prof.status_tag || "inactive"
        });
      }
      const { data: usData } = await supabase.from("user_sports").select(` id, metadata, sports ( name ) `).eq("user_id", userId);
      if (usData) setUserSports(usData as unknown as UserSport[]);
      const { data: sData } = await supabase.from("sports").select("*");
      if (sData) setAllSports(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        setUser(authUser);
        loadProfileData(authUser.id);
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  // ==========================================
  // 4. 真雲端上傳與資料庫同步事件
  // ==========================================
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !user) return;

    setIsSaving(true);
    // 呼叫智慧壓縮
    const fileToUpload = await compressImageInline(rawFile);

    // 建立唯一的雲端儲存路徑
    const fileExt = rawFile.name.split('.').pop();
    const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    // 1. 推送到 Supabase Storage 的 avatars 儲存庫
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, fileToUpload, { upsert: true });

    if (uploadError) {
      alert("頭像上傳雲端失敗：" + uploadError.message);
      setIsSaving(false);
      return;
    }

    // 2. 獲取該檔案的全球 CDN 公開網址
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // 3. 同步更新前端表單狀態 (此時尚未寫入 profiles 表，按下完成時才會一起儲存)
    setEditForm(prev => ({ ...prev, avatar_url: publicUrl }));
    setIsSaving(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // 💡 採用防禦型 upsert 覆寫機制，確保新舊帳號皆能完美寫入
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: editForm.full_name,
      headline: editForm.headline,
      location: editForm.location,
      bio: editForm.bio,
      avatar_url: editForm.avatar_url,
      is_coach: editForm.is_coach,
      coach_rate: Number(editForm.coach_rate),
      status_tag: editForm.status_tag
    });

    if (!error) {
      setProfile({ ...profile, ...editForm } as Profile);
      setIsEditing(false);
    } else {
      alert("資料庫同步失敗：" + error.message);
    }
    setIsSaving(false);
  };

  const handleAddSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSportId || !user) return;
    setIsSubmittingSport(true);
    const { error } = await supabase.from("user_sports").insert({
      user_id: user.id,
      sport_id: selectedSportId,
      metadata: { position: "主力選手" }
    });
    if (!error) {
      await loadProfileData(user.id);
      setIsSportModalOpen(false);
    } else {
      alert("專長綁定失敗");
    }
    setIsSubmittingSport(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !uploadMediaSport || !user) return;

    setIsUploadingMedia(true);
    const fileToUpload = await compressImageInline(rawFile);

    const fileExt = rawFile.name.split('.').pop();
    const filePath = `${user.id}/highlight-${Date.now()}.${fileExt}`;

    // 1. 推送到 storage 的 highlights 儲存庫
    const { error: uploadError } = await supabase.storage
      .from("highlights")
      .upload(filePath, fileToUpload);

    if (uploadError) {
      alert("影音上傳雲端失敗：" + uploadError.message);
      setIsUploadingMedia(false);
      return;
    }

    // 2. 獲取 CDN 公開網址
    const { data: { publicUrl } } = supabase.storage
      .from("highlights")
      .getPublicUrl(filePath);

    // 3. 將真實 CDN 網址推入本地狀態陣列
    setGalleryMedia([
      { id: Date.now().toString(), sportName: uploadMediaSport, type: "image", url: publicUrl, createdAt: "剛剛" },
      ...galleryMedia
    ]);
    
    setIsMediaModalOpen(false);
    setUploadMediaSport("");
    setIsUploadingMedia(false);
  };

  const renderStatusBadge = (tag: string | null) => {
    switch(tag) {
      case 'open_to_team': return <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/> 招募中</div>;
      case 'looking_for_sub': return <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/> 可替補</div>;
      default: return <div className="inline-flex items-center gap-1.5 bg-pro-slate-800/50 border border-pro-slate-700/50 text-zinc-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-pro-slate-500"/> 穩定訓練</div>;
    }
  };

  if (isLoading) return <div className="min-h-screen bg-pro-slate-950 flex items-center justify-center text-zinc-500 font-mono">安全連線中...</div>;

  return (
    <div className="bg-pro-slate-950 min-h-screen text-zinc-200 font-sans selection:bg-pro-blue-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ==========================================
              左側黃金側邊欄 (Sticky Identity Column)
             ========================================== */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-pro-slate-900/40 backdrop-blur-xl border border-pro-slate-800/60 rounded-3xl p-6 sticky top-20 shadow-2xl">
              
              {/* 大頭貼區 */}
              <div className="relative group w-32 h-32 mx-auto mb-6">
                <div className="w-full h-full rounded-[2rem] bg-pro-slate-800 border-2 border-pro-slate-700/50 shadow-xl overflow-hidden relative flex items-center justify-center text-4xl font-black text-zinc-600 bg-cover bg-center transform transition duration-500"
                     style={{ backgroundImage: editForm.avatar_url ? `url(${editForm.avatar_url})` : profile?.avatar_url ? `url(${profile.avatar_url})` : 'none' }}>
                  {!editForm.avatar_url && !profile?.avatar_url && (profile?.full_name?.[0] || "PRO")}
                </div>
                {isEditing && (
                  <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-pro-slate-950/60 rounded-[2rem] flex flex-col items-center justify-center text-white text-xs font-bold border border-dashed border-pro-slate-400 backdrop-blur-sm z-10">
                    {isSaving ? "上傳中..." : "📸 換照片"}
                  </button>
                )}
                <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                
                <div className="absolute -bottom-3 -right-6 z-20">
                  {renderStatusBadge(isEditing ? editForm.status_tag : profile?.status_tag ?? null)}
                </div>
              </div>

              {/* 身份文字與表單編輯區 */}
              {isEditing ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Name</label>
                    <input className="w-full bg-pro-slate-950/50 border border-pro-slate-800 rounded-xl p-3 text-white text-sm focus:border-pro-slate-50 focus:outline-none transition" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} placeholder="真實姓名 / 暱稱" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Headline</label>
                    <input className="w-full bg-pro-slate-950/50 border border-pro-slate-800 rounded-xl p-3 text-white text-sm focus:border-pro-slate-50 focus:outline-none transition" value={editForm.headline} onChange={e => setEditForm({...editForm, headline: e.target.value})} placeholder="例如: 網球底線玩家" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Bio</label>
                    <textarea className="w-full bg-pro-slate-950/50 border border-pro-slate-800 rounded-xl p-3 text-white text-sm focus:border-pro-slate-50 focus:outline-none transition h-24 resize-none" value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} placeholder="寫下你的訓練哲學..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Location</label>
                    <input className="w-full bg-pro-slate-950/50 border border-pro-slate-800 rounded-xl p-3 text-white text-sm focus:border-pro-slate-50 focus:outline-none transition" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="例如: 台北市" />
                  </div>
                  
                  <div className="p-4 bg-pro-slate-950/50 rounded-2xl border border-pro-slate-800/80 space-y-4 mt-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">招募意向狀態</label>
                      <select className="w-full bg-pro-slate-900 border border-pro-slate-700 rounded-lg p-2 text-white text-xs outline-none" value={editForm.status_tag} onChange={e => setEditForm({...editForm, status_tag: e.target.value})}>
                        <option value="open_to_team">🟢 尋找球隊招募</option>
                        <option value="looking_for_sub">🟡 可接受替補邀約</option>
                        <option value="inactive">⚪ 暫不公開意向</option>
                      </select>
                    </div>
                    <div className="pt-3 border-t border-pro-slate-800/80">
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" checked={editForm.is_coach} onChange={e => setEditForm({...editForm, is_coach: e.target.checked})} className="rounded bg-pro-slate-900 border-pro-slate-700" />
                        <span className="text-xs font-bold text-white">開啟教練模式</span>
                      </label>
                      {editForm.is_coach && (
                        <div className="flex items-center gap-2 bg-pro-slate-900 p-2 rounded-lg border border-pro-slate-700">
                          <span className="text-xs text-zinc-400 pl-1">時薪 HK$</span>
                          <input type="number" className="flex-1 bg-transparent text-white font-bold text-right outline-none text-sm" value={editForm.coach_rate} onChange={e => setEditForm({...editForm, coach_rate: Number(e.target.value)})} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 bg-pro-slate-50 hover:bg-pro-slate-200 text-black font-black py-3 rounded-xl transition">{isSaving ? "核心同步中..." : "完成變更"}</button>
                    <button onClick={() => { setIsEditing(false); loadProfileData(user.id); }} className="px-4 bg-pro-slate-800 text-zinc-300 font-bold rounded-xl hover:bg-pro-slate-700">取消</button>
                  </div>
                </div>
              ) : (
                <div className="text-center animate-fadeIn mt-2">
                  <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{profile?.full_name || "Unknown"}</h1>
                  <p className="text-sm font-bold text-zinc-400 mb-4">{profile?.headline || "設定你的場上宣言"}</p>
                  
                  {profile?.is_coach && (
                    <div className="inline-block bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-xs font-black px-4 py-1.5 rounded-full mb-4">
                      🏆 認證教練 ｜ HK$ {profile.coach_rate}/hr
                    </div>
                  )}

                  <p className="text-sm text-zinc-300 leading-relaxed text-left bg-pro-slate-900/30 p-4 rounded-2xl border border-pro-slate-800/50 mb-6">
                    {profile?.bio || "寫下一段關於你的體育歷程，讓球探或隊員更認識你。"}
                  </p>

                  <div className="flex flex-col gap-3">
                    <button onClick={() => setIsEditing(true)} className="w-full bg-pro-slate-800 hover:bg-pro-slate-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                      ✏️ 編輯檔案
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${user.id}`); alert("名片網址已複製！"); }} className="w-full bg-transparent border border-pro-slate-700 hover:border-pro-slate-500 text-zinc-300 font-bold py-3 rounded-xl transition">
                      分享連結 ↗
                    </button>
                  </div>

                  <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-500 font-medium">
                    <span>📍 {profile?.location || "位置未公開"}</span>
                    <span>•</span>
                    <span>ID: {user?.id?.slice(0,6)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ==========================================
              右側動態主場 (The Field / Content Area)
             ========================================== */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
            
            {/* 專業化膠囊分頁導航 (Pill Tabs) */}
            <div className="bg-pro-slate-900/60 backdrop-blur-xl border border-pro-slate-800/80 p-1.5 rounded-2xl flex overflow-x-auto hide-scrollbar sticky top-16 z-30 mb-8">
              {[
                { id: "dashboard", icon: "📊", label: "數據後台" },
                { id: "arsenal", icon: "📋", label: "專長規格" },
                { id: "highlights", icon: "🎞️", label: "賽事影音" },
                { id: "feed", icon: "📰", label: "產業動態" }
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === t.id ? "bg-pro-slate-50 text-black shadow-lg scale-[1.02]" : "text-zinc-500 hover:text-white hover:bg-pro-slate-800/50"}`}>
                  <span className="text-base">{t.icon}</span> <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* 分頁內容區 */}
            <div className="flex-1">
              
              {/* --- 1. 數據後台 Dashboard --- */}
              {activeTab === "dashboard" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-pro-slate-900/40 border border-pro-slate-800/60 p-5 rounded-3xl backdrop-blur-sm flex flex-col justify-center"><span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Views</span><span className="text-3xl font-black text-white">1,204</span></div>
                    <div className="bg-pro-slate-900/40 border border-pro-slate-800/60 p-5 rounded-3xl backdrop-blur-sm flex flex-col justify-center"><span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Scout Search</span><span className="text-3xl font-black text-blue-400">48</span></div>
                    <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-500/20 p-5 rounded-3xl flex items-center justify-between"><div><span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest block mb-1">Rankings</span><span className="text-xl font-black text-white">Top 5% 活躍度</span></div><div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-xl">🔥</div></div>
                  </div>
                  <div className="bg-pro-slate-900/40 border border-pro-slate-800/60 rounded-3xl p-8 text-center"><div className="w-16 h-16 bg-pro-slate-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">🏆</div><h3 className="text-white font-bold mb-2">準備好參加賽事了嗎？</h3><p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">完善你的「專長規格」與「賽事影音」，雲端資料庫已就緒，系統將為您智慧推播最合適的戰隊職缺。</p></div>
                </div>
              )}

              {/* --- 2. 專長規格 Arsenal --- */}
              {activeTab === "arsenal" && (
                <div className="animate-fadeIn space-y-6">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <div><h2 className="text-xl font-black text-white">認證裝備與專長規格</h2><p className="text-xs text-zinc-500 mt-1">展示你的場上真實硬參數</p></div>
                    <button onClick={() => setIsSportModalOpen(true)} className="bg-pro-slate-50 text-black text-xs font-black px-4 py-2.5 rounded-full hover:scale-105 transition shadow-[0_0_15px_rgba(255,255,255,0.2)]">＋ 新增專長項目</button>
                  </div>
                  {userSports.length === 0 ? (
                    <div className="text-center py-20 bg-pro-slate-900/30 border border-dashed border-pro-slate-700/50 rounded-3xl"><p className="text-zinc-500 text-sm font-bold">空蕩蕩的專長欄... 立即宣告你的專業項目！</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {userSports.map((us) => (
  <div key={us.id} className="bg-pro-slate-900/50 border border-pro-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-pro-slate-600 transition duration-300 flex flex-col justify-between">
    <div className="absolute top-0 right-0 w-24 h-24 bg-pro-blue-500/5 rounded-bl-full -mr-4 -mt-4" />
    
    <div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-xl font-black text-white tracking-tight">{us.sports?.name}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-pro-slate-950 px-2.5 py-1 rounded-full border border-pro-slate-800">Verified Spec</span>
      </div>
      <div className="space-y-2 relative z-10">
        <div className="flex justify-between items-center text-sm pb-1">
          <span className="text-zinc-500 font-bold">定位</span>
          <span className="text-blue-400 font-black">{us.metadata?.position || "主力選手"}</span>
        </div>
      </div>
    </div>

    {/* 💡 具體加在這裡：卡片底部的紅色垃圾桶按鈕 */}
    <div className="pt-4 mt-4 border-t border-pro-slate-800/80 flex justify-end relative z-10">
      <button
        onClick={async (e) => {
          e.stopPropagation();
          const confirmDelete = window.confirm(`確定要自武器庫移除 ${us.sports?.name} 嗎？`);
          if (!confirmDelete) return;
          
          const { error } = await supabase.from("user_sports").delete().eq("id", us.id);
          if (!error) {
            setUserSports(userSports.filter(item => item.id !== us.id));
          } else {
            alert("移除失敗：" + error.message);
          }
        }}
        className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500/20 transition"
      >
        <span>🗑️</span> 移除項目
      </button>
    </div>
  </div>
))}
                    </div>
                  )}
                </div>
              )}

              {/* --- 3. 賽事影音 Highlights --- */}
              {activeTab === "highlights" && (
                <div className="animate-fadeIn space-y-6">
                  <div className="flex flex-wrap justify-between items-end mb-2 px-2 gap-4">
                    <div><h2 className="text-xl font-black text-white">賽場高清圖庫</h2><p className="text-xs text-zinc-500 mt-1">直連雲端 Storage CDN 的視覺歷程</p></div>
                    {userSports.length > 0 ? (
                      <button onClick={() => setIsMediaModalOpen(true)} className="bg-pro-slate-50 text-black text-xs font-black px-4 py-2.5 rounded-full hover:scale-105 transition shadow-[0_0_15px_rgba(255,255,255,0.2)]">📸 上傳新高光</button>
                    ) : <p className="text-xs text-amber-500 font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">請先宣告「專長規格」項目</p>}
                  </div>
                  <div className="columns-2 md:columns-3 gap-4 space-y-4">
                    {galleryMedia.map(m => (
                      <div key={m.id} className="break-inside-avoid relative group rounded-2xl overflow-hidden border border-pro-slate-800/80 bg-pro-slate-900 shadow-md">
                        <img src={m.url} alt="Highlight" className="w-full h-auto object-cover transform transition duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4"><span className="text-[10px] font-black text-white uppercase tracking-wider mb-1">{m.sportName}</span><span className="text-xs text-zinc-400 font-medium">{m.createdAt}</span></div>
                        <div className="absolute top-3 left-3"><span className="bg-pro-slate-950/60 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded border border-pro-slate-50/10">{m.sportName}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- 4. 產業動態 Feed --- */}
              {activeTab === "feed" && (
                <div className="animate-fadeIn space-y-6 max-w-3xl">
                  <div className="bg-pro-slate-900/30 border border-pro-slate-800/80 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-pro-slate-800 bg-cover bg-center" style={{ backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : 'none' }} />
                      <div><h4 className="text-sm font-black text-white">{profile?.full_name || "運動員"}</h4><span className="text-[10px] text-zinc-500 uppercase tracking-widest">Just now • Professional Feed</span></div>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">成功對接雲端金庫！未來的賽事動態與發表，都將受到資料庫最高層級的 RLS 安全防禦保障。🔥</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          5. Modals 視窗區
         ========================================== */}
      {isSportModalOpen && (
        <div className="fixed inset-0 bg-pro-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-pro-slate-950 border border-pro-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">添入專長規格</h3>
            <form onSubmit={handleAddSport} className="space-y-5 text-sm">
              <select value={selectedSportId} onChange={e=>setSelectedSportId(e.target.value)} className="w-full bg-pro-slate-900 border border-pro-slate-800 rounded-xl p-3.5 text-white font-bold outline-none" required>
                <option value="">-- 選擇項目 --</option>
                {allSports.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-3">
                <button type="button" onClick={()=>setIsSportModalOpen(false)} className="flex-1 bg-pro-slate-900 text-zinc-400 font-bold py-3 rounded-xl">取消</button>
                <button type="submit" disabled={isSubmittingSport} className="flex-1 bg-pro-slate-50 text-black font-black py-3 rounded-xl">{isSubmittingSport ? "同步中..." : "確認加入"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMediaModalOpen && (
        <div className="fixed inset-0 bg-pro-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-pro-slate-950 border border-pro-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">歸檔雲端賽事影音</h3>
            <div className="space-y-5 text-sm">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">1. 歸屬類別</label>
                <select value={uploadMediaSport} onChange={e=>setUploadMediaSport(e.target.value)} className="w-full bg-pro-slate-900 border border-pro-slate-800 rounded-xl p-3.5 text-white font-bold outline-none">
                  <option value="">-- 選擇專長 --</option>
                  {userSports.map(us=><option key={us.id} value={us.sports?.name}>{us.sports?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">2. 選擇檔案 (大於1.5MB將啟動智慧壓縮)</label>
                <div className="border-2 border-dashed border-pro-slate-800 hover:border-pro-slate-600 transition rounded-xl p-4 text-center cursor-pointer relative overflow-hidden">
                   <input type="file" ref={mediaInputRef} onChange={handleMediaUpload} accept="image/*" disabled={!uploadMediaSport || isUploadingMedia} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                   <span className="text-zinc-400 font-bold block">{isUploadingMedia ? "雲端推流中..." : uploadMediaSport ? "點擊選擇照片" : "請先選擇上方類別"}</span>
                </div>
              </div>
              <button onClick={() => setIsMediaModalOpen(false)} className="w-full bg-pro-slate-900 text-zinc-400 font-bold py-3 rounded-xl mt-2">關閉視窗</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default dynamic(() => Promise.resolve(ProfilePageContent), { ssr: false });
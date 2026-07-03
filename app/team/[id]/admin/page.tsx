"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const REGION_OPTIONS = [
  { value: "全港",  label: "🌐 全港 All HK" },
  { value: "港島",  label: "🏙️ 港島 Hong Kong Island" },
  { value: "九龍",  label: "🌆 九龍 Kowloon" },
  { value: "新界",  label: "🏞️ 新界 New Territories" },
];

export default function TeamAdminDashboard() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [activeTab, setActiveTab] = useState<"roster" | "settings">("roster");
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Settings form states
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameZh, setEditNameZh] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAuthorized(false); return; }
      setCurrentUserId(user.id);

      const [teamRes, memRes] = await Promise.all([
        supabase.from("teams").select("*").eq("id", id).single(),
        supabase.from("team_members").select("user_id, role, joined_at, profiles(id, full_name, avatar_url)").eq("team_id", id),
      ]);

      if (!teamRes.data) { setIsAuthorized(false); return; }
      
      const myMembership = memRes.data?.find((m: any) => m.user_id === user.id);
      if (!myMembership || myMembership.role !== "admin") {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
      setTeam(teamRes.data);
      setMembers(memRes.data || []);

      setEditNameEn(teamRes.data.name_en || "");
      setEditNameZh(teamRes.data.name_zh || "");
      setEditStatus(teamRes.data.recruitment_status || "open");
      setEditBio(teamRes.data.bio || "");
      setEditPhone(teamRes.data.social_links?.phone || "");
      setEditEmail(teamRes.data.social_links?.email || "");
      setLogoPreview(teamRes.data.logo_url || null);
      setCoverPreview(teamRes.data.cover_url || null);
      
      const currentRegions = teamRes.data.sport_metadata?.location_regions || [];
      setSelectedRegions(currentRegions);
    } catch (err) {
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDashboardData();
  }, [id, supabase]);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase.from("team_members").update({ role: "player" }).eq("team_id", id).eq("user_id", userId);
    if (!error) fetchDashboardData();
  };

  const handleRejectOrRemove = async (userId: string, isRemove = false) => {
    if (isRemove && userId === currentUserId) { alert("身為最高管理員，您不能將自己移出群組。"); return; }
    if (isRemove && !confirm("確定要移除此成員嗎？該成員將失去瀏覽內部資訊的權限。")) return;
    
    const { error } = await supabase.from("team_members").delete().eq("team_id", id).eq("user_id", userId);
    if (!error) fetchDashboardData();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUserId && newRole !== "admin") {
      alert("您不能取消自己的管理員身分，群組必須至少擁有一名 Admin。");
      return;
    }
    const { error } = await supabase.from("team_members").update({ role: newRole }).eq("team_id", id).eq("user_id", userId);
    if (!error) fetchDashboardData();
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (type === "logo") {
      setLogoFile(file);
      setLogoPreview(objectUrl);
    } else {
      setCoverFile(file);
      setCoverPreview(objectUrl);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      let finalLogoUrl = team.logo_url;
      let finalCoverUrl = team.cover_url;

      if (logoFile && currentUserId) {
        const ext = logoFile.name.split(".").pop();
        const path = `logos/${currentUserId}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("team-assets").upload(path, logoFile, { upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("team-assets").getPublicUrl(path);
          finalLogoUrl = publicUrl;
        }
      }

      if (coverFile && currentUserId) {
        const ext = coverFile.name.split(".").pop();
        const path = `covers/${currentUserId}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("team-assets").upload(path, coverFile, { upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("team-assets").getPublicUrl(path);
          finalCoverUrl = publicUrl;
        }
      }

      const locationString = selectedRegions.length > 0 ? selectedRegions.join("、") : null;
      const updatedMetadata = { ...(team.sport_metadata || {}), location_regions: selectedRegions };
      const updatedSocial = { ...(team.social_links || {}), phone: editPhone.trim() || undefined, email: editEmail.trim() || undefined };

      const { error } = await supabase
        .from("teams")
        .update({
          name_en: editNameEn.trim(),
          name_zh: editNameZh.trim() || null,
          recruitment_status: editStatus,
          bio: editBio.trim() || null,
          logo_url: finalLogoUrl,
          cover_url: finalCoverUrl,
          location_region: locationString,
          social_links: updatedSocial,
          sport_metadata: updatedMetadata
        })
        .eq("id", id);

      if (!error) {
        alert("🎉 群組後台資訊已成功更新！");
        setLogoFile(null);
        setCoverFile(null);
        fetchDashboardData();
      } else {
        alert("儲存失敗：" + error.message);
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ✅ 解散與刪除球隊邏輯
  const handleDeleteTeam = async () => {
    const promptMatch = prompt(`⚠️ 極度危險操作！解散後所有成員紀錄將被清除且無法復原。\n請輸入球隊英文名稱「${team.name_en}」確認刪除：`);
    if (promptMatch !== team.name_en) {
      if (promptMatch !== null) alert("輸入名稱不吻合，已取消操作。");
      return;
    }

    setIsDeleting(true);
    try {
      // 依序刪除成員與球隊
      await supabase.from("team_members").delete().eq("team_id", id);
      const { error } = await supabase.from("teams").delete().eq("id", id);

      if (!error) {
        alert("🗑️ 群組已成功解散並移除。");
        router.push("/team");
      } else {
        alert("解散群組失敗：" + error.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono text-sm">載入管理權限中...</div>;
  if (isAuthorized === false) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="text-4xl">🔒</div>
      <h1 className="text-xl font-black text-white">無權限訪問群組後台</h1>
      <p className="text-sm text-zinc-400">只有該群組的核心管理員方能登入本設定大本營。</p>
      <Link href={`/team/${id}`} className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition">回到公開頁面</Link>
    </div>
  );

  const pendingMembers = members.filter((m) => m.role === "pending");
  const activeMembers = members.filter((m) => m.role !== "pending");
  const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition";
  const labelCls = "block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 pl-1";

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 font-sans pb-24">
      <div className="w-full max-w-4xl md:max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        
        <div className="flex items-center justify-between mb-8">
          <Link href={`/team/${id}`} className="text-sm font-black text-amber-500 hover:text-amber-400 transition relative z-30">
            ← 前往球隊公開頁面查看預覽
          </Link>
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">後台中央管理層</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">{team.name_en} 核心主控台</h1>
        <p className="text-zinc-500 text-sm mb-8">全面掌管群組成員狀態、招募名單審核及團隊視覺資產變更。</p>

        <div className="flex gap-2 border-b border-slate-800 mb-8 pb-4">
          <button onClick={() => setActiveTab("roster")} className={`px-5 py-2.5 rounded-xl font-black text-sm transition ${activeTab === "roster" ? "bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.3)]" : "bg-slate-900 text-zinc-400 hover:text-white"}`}>
            👥 成員與申請審核 ({pendingMembers.length > 0 ? `${pendingMembers.length} 筆新申請` : activeMembers.length})
          </button>
          <button onClick={() => setActiveTab("settings")} className={`px-5 py-2.5 rounded-xl font-black text-sm transition ${activeTab === "settings" ? "bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.3)]" : "bg-slate-900 text-zinc-400 hover:text-white"}`}>
            ⚙️ 修改視覺與群組設定
          </button>
        </div>

        {activeTab === "roster" && (
          <div className="space-y-8">
            {pendingMembers.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 space-y-4">
                <h2 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> 收到加入群組的申請 ({pendingMembers.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingMembers.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex-shrink-0 bg-cover bg-center border border-slate-700" style={{ backgroundImage: m.profiles?.avatar_url ? `url(${m.profiles.avatar_url})` : "none" }}>
                          {!m.profiles?.avatar_url && (m.profiles?.full_name?.[0] || "U")}
                        </div>
                        <span className="font-black text-white text-sm truncate">{m.profiles?.full_name || "新成員"}</span>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-4">
                        <button onClick={() => handleApprove(m.user_id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition">批准</button>
                        <button onClick={() => handleRejectOrRemove(m.user_id)} className="bg-slate-800 hover:bg-red-600 text-zinc-400 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl transition">婉拒</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">目前現役群組成員牆 ({activeMembers.length})</h2>
              <div className="space-y-2">
                {activeMembers.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl hover:border-slate-700 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0 bg-cover bg-center border border-slate-700" style={{ backgroundImage: m.profiles?.avatar_url ? `url(${m.profiles.avatar_url})` : "none" }}>
                        {!m.profiles?.avatar_url && (m.profiles?.full_name?.[0] || "U")}
                      </div>
                      <span className="text-sm font-black text-white truncate">
                        {m.profiles?.full_name || "群組運動員"}
                        {m.user_id === currentUserId && <span className="ml-2 text-[9px] bg-slate-800 border border-slate-700 text-zinc-400 px-2 py-0.5 rounded-full font-normal">您自己</span>}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none"
                      >
                        <option value="admin">主要管理員 Admin</option>
                        <option value="coach">專業教練 Coach</option>
                        <option value="captain">領隊/隊長 Captain</option>
                        <option value="player">群組成員 Player</option>
                      </select>
                      {m.user_id !== currentUserId && (
                        <button onClick={() => handleRejectOrRemove(m.user_id, true)} className="text-zinc-600 hover:text-red-500 p-2 text-xs transition" title="剔除成員">
                          🗑️ 踢除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-10">
            <form onSubmit={handleSaveSettings} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest pl-1">🖼️ 更換群組視覺檔案 (本地選檔上傳)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 pl-1">群組圓形 Logo 標誌</span>
                    <label className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-600 transition">
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "logo")} className="hidden" />
                      {logoPreview ? (
                        <div className="w-9 h-9 rounded-lg bg-cover bg-center border border-slate-700" style={{ backgroundImage: `url(${logoPreview})` }} />
                      ) : (
                        <span className="text-lg">📁</span>
                      )}
                      <span className="text-xs font-bold text-zinc-400">{logoFile ? "已選擇新檔案" : "點擊上傳新 Logo"}</span>
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 pl-1">專頁頂部封面大圖</span>
                    <label className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-600 transition">
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "cover")} className="hidden" />
                      {coverPreview ? (
                        <div className="w-16 h-6 rounded bg-cover bg-center border border-slate-700" style={{ backgroundImage: `url(${coverPreview})` }} />
                      ) : (
                        <span className="text-lg">🏞️</span>
                      )}
                      <span className="text-xs font-bold text-zinc-400">{coverFile ? "已選擇新封面" : "點擊上傳新橫幅"}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>英文群組名</label>
                  <input className={inputCls} value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls}>中文群組名 (選填)</label>
                  <input className={inputCls} value={editNameZh} onChange={(e) => setEditNameZh(e.target.value)} />
                </div>
              </div>

              {/* ✅ 聯絡方式編輯 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>公開聯絡電話 / WhatsApp</label>
                  <input className={inputCls} placeholder="+852 ..." value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>公開聯絡 Email</label>
                  <input type="email" className={inputCls} placeholder="team@example.com" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelCls}>變更主要活動地區 (支援複選)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {REGION_OPTIONS.map((r) => {
                    const isChecked = selectedRegions.includes(r.value);
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => toggleRegion(r.value)}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition text-left ${isChecked ? "bg-amber-500/10 border-amber-500 text-amber-400" : "bg-slate-950 border-slate-800 text-zinc-500 hover:text-white"}`}
                      >
                        {isChecked ? "✓ " : "+ "} {r.label.split(" ")[1] || r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>招募開放狀態</label>
                <select className={inputCls} value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="open">🟢 開放所有人公開招募 (Open)</option>
                  <option value="invite_only">🔵 嚴格審查 / 邀請制 (Invite Only)</option>
                  <option value="closed">🔴 關閉狀態 / 暫停招募 (Closed)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>修改群組與戰隊介紹 Bio</label>
                <textarea className={`${inputCls} h-36 resize-none leading-relaxed`} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="填寫戰隊描述..." />
              </div>

              <button type="submit" disabled={isSavingSettings} className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-black py-3.5 rounded-xl transition shadow-[0_0_15px_rgba(217,119,6,0.3)]">
                {isSavingSettings ? "同步上傳檔案並儲存更新中..." : "💾 確定儲存並更新群組設定"}
              </button>
            </form>

            {/* ✅ 危險區域：刪除與解散球隊 */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 md:p-8 space-y-4">
              <div>
                <h3 className="text-base font-black text-red-400 flex items-center gap-2">
                  ⚠️ 危險區域 Danger Zone
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  解散群組將會立刻刪除本團隊的所有歷史資料、專屬頁面以及所有成員名單，此動作無法復原。
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteTeam}
                disabled={isDeleting}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-black px-6 py-3 rounded-xl text-sm transition shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                {isDeleting ? "正在刪除群組資料..." : "🗑️ 永久刪除並解散本群組"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
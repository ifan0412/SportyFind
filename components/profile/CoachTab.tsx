"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CheckCircle2, MessageSquare, Plus, Trash2, Save, Loader2 } from "lucide-react";
import Link from "next/link";

interface Sport { id: string; name: string; }

interface CoachTabProps {
  coachProfiles: any[];
  allSports: any[];
  locationData: any;
  onAdd: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onSave: (coach: any) => void;
  onDelete: (id: string) => void;
  
  editForm?: any; 
  onFieldChange?: (field: string, value: any) => void;
  onSaveGlobal?: () => void; 
  isSaving?: boolean;       
}

// ── 1. 潛在學生諮詢單名單 (Leads Inbox) — 自動抓取登入 ID 保證顯示 ──
function CoachEnquiriesInbox({ fallbackCoachId }: { fallbackCoachId?: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = user?.id || fallbackCoachId;
      
      if (!targetId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("coach_enquiries")
        .select(`
          *,
          service:coach_services!service_id (title, sport_category),
          student:profiles!student_id (id, full_name, avatar_url)
        `)
        .eq("coach_id", targetId)
        .order("created_at", { ascending: false });

      setLeads(data || []);
      setLoading(false);
    };
    fetchLeads();
  }, [fallbackCoachId, supabase]);

  const markContacted = async (id: string) => {
    await supabase.from("coach_enquiries").update({ status: "contacted" }).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: "contacted" } : l));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 mt-12">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          潛在學生諮詢單名單 (Leads Inbox)
        </h3>
        <p className="text-xs text-zinc-500 mt-1">學員在您的獨立課程服務頁點擊「預約諮詢」時，詢問單將發送至此處。</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-8 text-center text-zinc-500 text-xs font-mono">載入詢問單中...</div>
        ) : leads.length === 0 ? (
          <div className="py-10 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
            目前尚無新進的學員諮詢單。當學員發送詢問時會立刻顯示在這裡！
          </div>
        ) : (
          leads.map(lead => (
            <div key={lead.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Link href={`/p/${lead.student?.id}`} className="shrink-0 cursor-pointer">
                  <div
                    className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center"
                    style={lead.student?.avatar_url ? { backgroundImage: `url(${lead.student.avatar_url})` } : undefined}
                  />
                </Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/p/${lead.student?.id}`} className="font-bold text-sm text-white hover:underline cursor-pointer">
                      {lead.student?.full_name || "未知運動員"}
                    </Link>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                      諮詢：{lead.service?.title || "專項課程"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                    💬 「{lead.message}」
                  </p>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    送出時間：{new Date(lead.created_at).toLocaleString("zh-HK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {lead.status === "contacted" ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> 已聯絡
                  </span>
                ) : (
                  <button
                    onClick={() => markContacted(lead.id)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    標記為已聯絡
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── 2. 獨立課程與服務管理面板 (Coach Services Manager) ──
function CoachServicesManager({ allSports }: { allSports: any[] }) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data } = await supabase
      .from("coach_services")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });

    setServices(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleAddService = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("請先登入");

    const newService = {
      coach_id: user.id,
      title: "新課程專案 (點擊修改標題)",
      sport_category: allSports[0]?.name || "volleyball",
      hourly_rate: 500,
      location: "香港 / 現場可議",
      description: "請填寫詳細的授課內容、程度要求與教學目標...",
      is_active: true
    };

    const { data, error } = await supabase.from("coach_services").insert(newService).select().single();
    if (error) {
      alert("新增失敗: " + error.message);
    } else if (data) {
      setServices([data, ...services]);
    }
  };

  const handleUpdateService = (id: string, field: string, value: any) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSaveService = async (srv: any) => {
    setSavingId(srv.id);
    const { error } = await supabase
      .from("coach_services")
      .update({
        title: srv.title,
        sport_category: srv.sport_category,
        hourly_rate: srv.hourly_rate,
        location: srv.location,
        description: srv.description,
        is_active: srv.is_active
      })
      .eq("id", srv.id);

    setSavingId(null);
    if (error) alert("儲存失敗: " + error.message);
    else alert("🎉 課程專案已更新發布！點擊公開檔案即可查看。");
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("確定要刪除此課程專案嗎？")) return;
    await supabase.from("coach_services").delete().eq("id", id);
    setServices(services.filter(s => s.id !== id));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-black text-white">開立獨立課程與教學專案 (`coach_services`)</h3>
          <p className="text-xs text-zinc-400 mt-1">此處建立的專案會生成專屬詳細頁面，提供學員查看介紹與發送報價諮詢單。</p>
        </div>
        <button
          onClick={handleAddService}
          type="button"
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> ＋ 新增獨立課程
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-zinc-500 text-xs font-mono">載入課程列表中...</div>
      ) : services.length === 0 ? (
        <div className="py-10 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
          您目前沒有開立任何獨立課程專案。點擊右上方「＋ 新增獨立課程」開始建立！
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {services.map(srv => (
            <div key={srv.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">課程標題</label>
                  <input
                    type="text"
                    value={srv.title}
                    onChange={(e) => handleUpdateService(srv.id, "title", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">專項類別</label>
                  <select
                    value={srv.sport_category}
                    onChange={(e) => handleUpdateService(srv.id, "sport_category", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white cursor-pointer"
                  >
                    {allSports.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                    <option value="volleyball">volleyball</option>
                    <option value="tennis">tennis</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">授課時薪 (HKD/小時)</label>
                  <input
                    type="number"
                    value={srv.hourly_rate}
                    onChange={(e) => handleUpdateService(srv.id, "hourly_rate", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-emerald-400 font-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">授課地點 / 區域</label>
                  <input
                    type="text"
                    value={srv.location || ""}
                    onChange={(e) => handleUpdateService(srv.id, "location", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">詳細課程說明</label>
                <textarea
                  rows={3}
                  value={srv.description || ""}
                  onChange={(e) => handleUpdateService(srv.id, "description", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-zinc-300"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                <Link
                  href={`/coaches/services/${srv.id}`}
                  target="_blank"
                  className="text-xs text-blue-400 hover:underline font-bold"
                >
                  ↗ 預覽此專案頁面
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteService(srv.id)}
                    type="button"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSaveService(srv)}
                    disabled={savingId === srv.id}
                    type="button"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingId === srv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    儲存更新
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 3. 主組件：CoachTab ──
export function CoachTab({ 
  coachProfiles, 
  allSports, 
  locationData, 
  onAdd, 
  onUpdate, 
  onSave, 
  onDelete,
  onSaveGlobal,  
  isSaving,       
  editForm,
  onFieldChange
}: CoachTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      
      <div className="mb-4">
        <h2 className="text-lg md:text-xl font-black text-white">教練名片設定</h2>
        <p className="text-[10px] md:text-xs text-zinc-500 mt-1">管理您的全域聯絡資訊、獨立課程專案與詢問收件匣。</p>
      </div>

      {editForm && onFieldChange && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 mb-8 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm md:text-base font-black text-white">對外聯絡與服務地點</h3>
            <p className="text-[10px] md:text-xs text-zinc-500 mt-1">此設定將套用於您所有的教練名片。填寫後請點擊下方的按鈕以儲存。</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡信箱</label>
              <input
                type="email"
                value={editForm.contact_email || ""}
                onChange={(e) => onFieldChange("contact_email", e.target.value)}
                placeholder="coach@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 transition outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡電話 (選填)</label>
              <input
                type="tel"
                value={editForm.contact_phone || ""}
                onChange={(e) => onFieldChange("contact_phone", e.target.value)}
                placeholder="+852 9876 5432"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 transition outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">主要服務地區</label>
              <input
                type="text"
                value={editForm.city_region || ""}
                onChange={(e) => onFieldChange("city_region", e.target.value)}
                placeholder="例如：九龍區 / 港島東"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 transition outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">詳細地址 (場館/工作室)</label>
              <input
                type="text"
                value={editForm.address || ""}
                onChange={(e) => onFieldChange("address", e.target.value)}
                placeholder="例如：彌敦道 123 號 4 樓"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 transition outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={editForm.is_address_public ?? true}
              onChange={(e) => onFieldChange("is_address_public", e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-amber-500 bg-slate-950"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-200">公開詳細地址</span>
              <span className="text-[10px] md:text-xs text-slate-500">關閉後，名片上將只顯示「主要服務地區」，保護您的隱私。</span>
            </div>
          </label>

          <div className="mt-6 space-y-4 border-t border-slate-800/80 pt-6">
            <h4 className="text-sm font-bold text-white mb-3">社群媒體連結</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Instagram</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/..."
                  value={editForm.instagram_url || ""}
                  onChange={(e) => onFieldChange("instagram_url", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Facebook</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/..."
                  value={editForm.facebook_url || ""}
                  onChange={(e) => onFieldChange("facebook_url", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Threads</label>
                <input
                  type="url"
                  placeholder="https://threads.net/..."
                  value={editForm.threads_url || ""}
                  onChange={(e) => onFieldChange("threads_url", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-8 pt-5 border-t border-slate-800/80">
            <button
              onClick={onSaveGlobal}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black px-8 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </div>
      )}

      {/* 🔥 全新：獨立課程與服務管理區塊 */}
      <CoachServicesManager allSports={allSports} />

      {/* ── 舊版收費與專項名片列表 ── */}
      <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-800/50 mb-2">
        <h3 className="text-base md:text-lg font-black text-white">收費與專項簡要名片 (`coach_profiles`)</h3>
        <button onClick={onAdd} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-black px-4 py-2.5 rounded-full shadow-[0_0_15px_rgba(217,119,6,0.3)] transition-all cursor-pointer">
          ＋ 新增專項
        </button>
      </div>

      {coachProfiles.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-700/50 rounded-3xl mt-4">
          <p className="text-zinc-500 text-sm font-bold">您尚未建立任何簡要名片，點擊右上方新增。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
          {coachProfiles.map(coach => (
            <div key={coach.id} className="bg-slate-900/40 border border-amber-500/20 rounded-3xl p-5 md:p-6 relative">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">指導專項</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm cursor-pointer" value={coach.sport} onChange={e => onUpdate(coach.id, "sport", e.target.value)}>
                    <option value="">-- 選擇專項 --</option>
                    {allSports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">時薪 (HK$)</label>
                    <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm" value={coach.rate} placeholder="例如: 500" onChange={e => onUpdate(coach.id, "rate", e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">狀態</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm cursor-pointer" value={coach.status} onChange={e => onUpdate(coach.id, "status", e.target.value)}>
                      <option value="recruiting">🟢 招生中</option>
                      <option value="full">🔴 滿員</option>
                      <option value="hidden">🔒 未發布</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">指導國家</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm cursor-pointer" value={coach.country} onChange={e => onUpdate(coach.id, "country", e.target.value)}>
                      <option value="">國家</option>
                      {Object.keys(locationData).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">指導區域</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 md:p-3 text-white text-sm cursor-pointer" value={coach.region} onChange={e => onUpdate(coach.id, "region", e.target.value)}>
                      <option value="">區域</option>
                      {coach.country && locationData[coach.country]?.map((r: string) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 mt-4 border-t border-slate-800">
                <button onClick={() => onSave(coach)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 md:py-3 rounded-xl text-xs md:text-sm shadow-md transition-colors cursor-pointer">儲存 / 發布</button>
                <button onClick={() => onDelete(coach.id)} className="px-3 md:px-4 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition text-xs md:text-sm cursor-pointer">刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔥 潛在學員諮詢單名單 (保證自動讀取目前登入 ID) */}
      <CoachEnquiriesInbox fallbackCoachId={editForm?.id || editForm?.user_id} />

    </div>
  );
}
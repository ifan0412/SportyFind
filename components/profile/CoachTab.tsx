"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CheckCircle2, MessageSquare, Plus, Trash2, Save, Loader2, UploadCloud, RotateCcw } from "lucide-react";
import Link from "next/link";

interface CoachTabProps {
  allSports: any[];
  editForm?: any; 
  onFieldChange?: (field: string, value: any) => void;
  onSaveGlobal?: () => void; 
  isSaving?: boolean;       
}

// 1. 潛在學生諮詢單名單
function CoachEnquiriesInbox({ fallbackCoachId }: { fallbackCoachId?: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = user?.id || fallbackCoachId;
      if (!targetId) { setLoading(false); return; }

      const { data: rawLeads } = await supabase
        .from("coach_enquiries")
        .select("*")
        .eq("coach_id", targetId)
        .order("created_at", { ascending: false });

      if (!rawLeads || rawLeads.length === 0) {
        setLeads([]); setLoading(false); return;
      }

      const enriched = await Promise.all(rawLeads.map(async (lead) => {
        const [{ data: student }, { data: service }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url").eq("id", lead.student_id).single(),
          supabase.from("coach_services").select("title, sport_category").eq("id", lead.service_id).single()
        ]);
        return { ...lead, student: student || null, service: service || null };
      }));

      setLeads(enriched);
      setLoading(false);
    };
    fetchLeads();
  }, [fallbackCoachId, supabase]);

  const toggleContacted = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "contacted" ? "pending" : "contacted";
    const { error } = await supabase.from("coach_enquiries").update({ status: newStatus }).eq("id", id);
    if (error) {
      alert("狀態更新失敗: 請確認已於 SQL Editor 新增 UPDATE 權限策略");
      return;
    }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 mt-12">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          潛在學生諮詢單名單 (Leads Inbox)
        </h3>
        <p className="text-xs text-zinc-500 mt-1">學員在您的課程卡片或獨立頁點擊「預約諮詢」時，諮詢單將自動發送至此。</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-8 text-center text-zinc-500 text-xs font-mono">載入詢問單中...</div>
        ) : leads.length === 0 ? (
          <div className="py-10 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
            目前尚無新進的學員諮詢單。
          </div>
        ) : (
          leads.map(lead => (
            <div key={lead.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Link href={`/p/${lead.student?.id || lead.student_id}`} className="shrink-0 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center" style={lead.student?.avatar_url ? { backgroundImage: `url(${lead.student.avatar_url})` } : undefined} />
                </Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/p/${lead.student?.id || lead.student_id}`} className="font-bold text-sm text-white hover:underline cursor-pointer">
                      {lead.student?.full_name || "未知運動員"}
                    </Link>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                      諮詢：{lead.service?.title || "專項課程"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">💬 「{lead.message}」</p>
                  <span className="text-[10px] text-zinc-500 mt-1 block">送出時間：{new Date(lead.created_at).toLocaleString("zh-HK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {lead.status === "contacted" ? (
                  <button onClick={() => toggleContacted(lead.id, lead.status)} className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 hover:text-zinc-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer" title="點擊改回未標記">
                    <CheckCircle2 className="w-4 h-4" /> <span>已標記聯絡</span>
                    <RotateCcw className="w-3 h-3 ml-0.5 text-zinc-400" />
                  </button>
                ) : (
                  <button onClick={() => toggleContacted(lead.id, lead.status)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer">
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

// 2. 獨立課程與服務設定 ( Coach Services Manager )
function CoachServicesManager({ allSports }: { allSports: any[] }) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data } = await supabase.from("coach_services").select("*").eq("coach_id", user.id).order("created_at", { ascending: false });
    setServices(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // 🔥 修正點 1 & 2：新增時預設欄位為乾淨的空白 ("")，搭配標準下拉
  const handleAddService = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("請先登入");

    const newService = {
      coach_id: user.id,
      title: "",
      sport_category: allSports[0]?.name || "Football / Soccer",
      hourly_rate: null,
      location: "九龍區 (Kowloon)",
      description: "",
      photos: [],
      is_active: true
    };

    const { data, error } = await supabase.from("coach_services").insert(newService).select().single();
    if (error) alert("新增失敗: " + error.message);
    else if (data) setServices([data, ...services]);
  };

  const handleUpdateService = (id: string, field: string, value: any) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleUploadPhoto = async (srvId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingId(srvId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingId(null); return; }

    const srv = services.find(s => s.id === srvId);
    const updatedPhotos = [...(srv.photos || [])];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = `${user.id}/services/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const { error: uploadErr } = await supabase.storage.from("highlights").upload(filePath, file);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("highlights").getPublicUrl(filePath);
        updatedPhotos.push(urlData.publicUrl);
      }
    }

    handleUpdateService(srvId, "photos", updatedPhotos);
    setUploadingId(null);
  };

  const handleRemovePhotoUrl = (srvId: string, idx: number) => {
    const srv = services.find(s => s.id === srvId);
    const updatedPhotos = (srv.photos || []).filter((_: any, i: number) => i !== idx);
    handleUpdateService(srvId, "photos", updatedPhotos);
  };

  const handleSaveService = async (srv: any) => {
    if (!srv.title?.trim()) return alert("請填寫課程標題");
    setSavingId(srv.id);
    const { error } = await supabase.from("coach_services").update({
      title: srv.title, sport_category: srv.sport_category, hourly_rate: srv.hourly_rate || 0, location: srv.location, description: srv.description, photos: srv.photos || [], is_active: srv.is_active
    }).eq("id", srv.id);

    setSavingId(null);
    if (error) alert("儲存失敗: " + error.message);
    else alert("🎉 課程專案已成功儲存發布！");
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
          <p className="text-xs text-zinc-400 mt-1">建立的課程將直接展示於教練名師榜大廳與個人檔案，供學員預約洽詢。</p>
        </div>
        <button onClick={handleAddService} type="button" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer">
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
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">課程標題 *</label>
                  <input
                    type="text"
                    value={srv.title || ""}
                    placeholder="例：一對一高階足球突破特訓班"
                    onChange={(e) => handleUpdateService(srv.id, "title", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">專項類別</label>
                  <select value={srv.sport_category} onChange={(e) => handleUpdateService(srv.id, "sport_category", e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white cursor-pointer font-bold">
                    {allSports && allSports.length > 0 ? (
                      allSports.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)
                    ) : (
                      <option value="Football / Soccer">Football / Soccer</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">授課時薪 (HKD/小時)</label>
                  {/* 🔥 修正點 3：解決數字 `0` 無法清空的問題 */}
                  <input
                    type="number"
                    value={srv.hourly_rate ?? ""}
                    placeholder="例：500"
                    onChange={(e) => handleUpdateService(srv.id, "hourly_rate", e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-emerald-400 font-black placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">授課區域 (地區下拉選單)</label>
                  {/* 🔥 修正點 4：統一使用緊湊的地區選單，與大廳篩選完美對齊 */}
                  <select
                    value={srv.location || ""}
                    onChange={(e) => handleUpdateService(srv.id, "location", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white cursor-pointer font-bold"
                  >
                    <option value="">請選擇授課區域...</option>
                    <option value="港島區 (Hong Kong Island)">港島區 (Hong Kong Island)</option>
                    <option value="九龍區 (Kowloon)">九龍區 (Kowloon)</option>
                    <option value="新界區 (New Territories)">新界區 (New Territories)</option>
                    <option value="離島區 (Outlying Islands)">離島區 (Outlying Islands)</option>
                    <option value="全港 / 現場可議">全港 / 現場可議</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">詳細課程說明</label>
                <textarea
                  rows={3}
                  value={srv.description || ""}
                  placeholder="請填寫授課目標、適合程度與課程特色介紹..."
                  onChange={(e) => handleUpdateService(srv.id, "description", e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-zinc-300 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-900">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">課程實況圖片 ({srv.photos?.length || 0})</label>
                  <label className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5">
                    {uploadingId === srv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    {uploadingId === srv.id ? "上傳中..." : "上傳相片"}
                    <input type="file" accept="image/*" multiple onChange={(e) => handleUploadPhoto(srv.id, e.target.files)} className="hidden" />
                  </label>
                </div>

                {srv.photos && srv.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {srv.photos.map((url: string, idx: number) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-800 group">
                        <img src={url} alt="course" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemovePhotoUrl(srv.id, idx)} className="absolute inset-0 bg-red-900/80 text-white font-black text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">刪除</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                <Link href={`/coaches/services/${srv.id}`} target="_blank" className="text-xs text-blue-400 hover:underline font-bold">↗ 預覽此專案頁面</Link>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDeleteService(srv.id)} type="button" className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  <button onClick={() => handleSaveService(srv)} disabled={savingId === srv.id} type="button" className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer">
                    {savingId === srv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 儲存更新
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

// 3. 主組件 CoachTab
export function CoachTab({ 
  allSports = [], 
  onSaveGlobal,  
  isSaving,       
  editForm,
  onFieldChange
}: CoachTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="mb-4">
        <h2 className="text-lg md:text-xl font-black text-white">教練名片設定</h2>
        <p className="text-[10px] md:text-xs text-zinc-500 mt-1">管理您的專屬教學導讀、獨立課程專案與諮詢單收件匣。</p>
      </div>

      {editForm && onFieldChange && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 mb-8 shadow-sm">
          
          <div className="mb-5 pb-5 border-b border-slate-800">
            <h3 className="text-sm md:text-base font-black text-white mb-1">專業教學導讀 (Coach Bio)</h3>
            <p className="text-[10px] md:text-xs text-zinc-500 mb-3">此自介獨立於您的運動員自介，將顯示在教練名片頂端。</p>
            <textarea
              rows={3}
              placeholder="例如：超過 10 年教學資歷，擅長針對不同程度學員客製化訓練課表..."
              value={editForm.coach_bio || ""}
              onChange={(e) => onFieldChange("coach_bio", e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 transition outline-none"
            />
          </div>

          <div className="mb-5">
            <h3 className="text-sm md:text-base font-black text-white">對外聯絡與服務地點</h3>
            <p className="text-[10px] md:text-xs text-zinc-500 mt-1">填寫後的聯絡方式將於學員點擊洽詢預約時呈現。</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡信箱</label>
              <input type="email" value={editForm.contact_email || ""} onChange={(e) => onFieldChange("contact_email", e.target.value)} placeholder="coach@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 transition outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡電話 (選填)</label>
              <input type="tel" value={editForm.contact_phone || ""} onChange={(e) => onFieldChange("contact_phone", e.target.value)} placeholder="+852 9876 5432" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 transition outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">主要服務地區</label>
              <input type="text" value={editForm.city_region || ""} onChange={(e) => onFieldChange("city_region", e.target.value)} placeholder="例如：九龍區 / 港島東" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 transition outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">詳細地址 (場館/工作室)</label>
              <input type="text" value={editForm.address || ""} onChange={(e) => onFieldChange("address", e.target.value)} placeholder="例如：彌敦道 123 號 4 樓" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 md:py-3 text-sm text-white focus:border-amber-500 transition outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
            <input type="checkbox" checked={editForm.is_address_public ?? true} onChange={(e) => onFieldChange("is_address_public", e.target.checked)} className="w-4 h-4 rounded border-slate-700 text-amber-500 bg-slate-950" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-200">公開詳細地址</span>
              <span className="text-[10px] md:text-xs text-slate-500">關閉後，名片上將只顯示「主要服務地區」，保護您的隱私。</span>
            </div>
          </label>

          <div className="flex justify-end mt-8 pt-5 border-t border-slate-800/80">
            <button onClick={onSaveGlobal} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black px-8 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 flex items-center gap-2 cursor-pointer">
              {isSaving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </div>
      )}

      {/* 獨立課程管理 */}
      <CoachServicesManager allSports={allSports} />

      {/* 諮詢收件匣 */}
      <CoachEnquiriesInbox fallbackCoachId={editForm?.id || editForm?.user_id} />
    </div>
  );
}
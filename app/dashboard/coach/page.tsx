"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Settings, BookOpen, Inbox, Save, Loader2,
  Plus, Trash2, UploadCloud, Edit3, MapPin, ArrowUpRight,
  CheckCircle2, RotateCcw
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { HKDistrictPicker } from "@/components/location/HKDistrictPicker";
import {
  formatDistrictList,
  formatSubdistrictList,
  normalizeDistrictIds,
  normalizeSubdistrictIds,
} from "@/lib/hk-locations";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { RichBody } from "@/components/content/RichBody";
import { BIO_CHAR_SUGGESTED_MAX, BIO_CHAR_SUGGESTED_RANGE } from "@/lib/content/body";
import { SportCategoryBadge } from "@/components/sports/SportCategoryBadge";
import { SportCategoryPicker } from "@/components/sports/SportCategoryPicker";
import type { SportCategoryId } from "@/lib/sports-categories";
import { stripHtml } from "@/lib/content/body";
import { ServicePublishBadge } from "@/components/services/ServicePublishBadge";

// ─── Enquiries Inbox ──────────────────────────────────────────────────────────
function CoachEnquiriesInbox({ coachId }: { coachId: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: rawLeads, error } = await supabase
        .from("coach_enquiries").select("*").eq("coach_id", coachId).order("created_at", { ascending: false });
      if (error || !rawLeads?.length) { setLeads([]); setLoading(false); return; }
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
    fetch();
  }, [coachId, supabase]);

  const toggleContacted = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "contacted" ? "seen" : "contacted";
    const { error } = await supabase.from("coach_enquiries").update({ status: newStatus }).eq("id", id);
    if (error) { alert("狀態更新失敗: " + error.message); return; }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("確定要刪除此諮詢單嗎？此動作無法復原。")) return;
    const { error } = await supabase.from("coach_enquiries").delete().eq("id", id);
    if (error) { alert("刪除失敗: " + error.message); return; }
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2"><Inbox className="w-5 h-5 text-amber-400" /> 潛在學生諮詢單名單</h3>
          <p className="text-xs text-zinc-500 mt-1">學員點擊「預約諮詢」後，所有諮詢單統一匯聚於此。</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">共 {leads.length} 筆</span>
      </div>
      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-amber-500" /> 載入詢問單中...</div>
      ) : leads.length === 0 ? (
        <div className="py-14 text-center bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
          <p className="text-sm text-zinc-400 mb-1">目前尚無新進的學員諮詢單。</p>
          <p>當學員發送詢問後，您將立即在此收到通知。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map(lead => (
            <div key={lead.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition">
              <div className="flex items-start gap-3.5 min-w-0">
                <Link href={`/p/${lead.student?.id || lead.student_id}`} className="shrink-0">
                  <div className="w-11 h-11 rounded-full bg-slate-800 bg-cover bg-center border border-slate-700" style={lead.student?.avatar_url ? { backgroundImage: `url(${lead.student.avatar_url})` } : undefined} />
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/p/${lead.student?.id || lead.student_id}`} className="font-bold text-sm text-white hover:text-amber-400 transition">{lead.student?.full_name || "未知運動員"}</Link>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">諮詢：{lead.service?.title || "專項課程"}</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800 leading-relaxed">💬 「{lead.message}」</p>
                  <span className="text-[10px] text-zinc-500 mt-1.5 block">送出時間：{new Date(lead.created_at).toLocaleString("zh-HK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {lead.status === "contacted" ? (
                  <button onClick={() => toggleContacted(lead.id, lead.status)} className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 hover:text-zinc-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer">
                    <CheckCircle2 className="w-4 h-4" /> 已標記聯絡 <RotateCcw className="w-3 h-3 text-zinc-400" />
                  </button>
                ) : (
                  <button onClick={() => toggleContacted(lead.id, lead.status)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-md">標記為已聯絡</button>
                )}
                <button onClick={() => handleDeleteLead(lead.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer" title="刪除諮詢單">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Services Manager ─────────────────────────────────────────────────────────
function CoachServicesManager({ coachId }: { coachId: string }) {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const deepLinkServiceId = searchParams.get("service");
  const openedDeepLinkRef = useRef<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "reviews" | "media" | "leads">("info");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [courseReviews, setCourseReviews] = useState<any[]>([]);
  const [courseLeads, setCourseLeads] = useState<any[]>([]);
  const [loadingSubData, setLoadingSubData] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [pendingServiceIds, setPendingServiceIds] = useState<Set<string>>(new Set());
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistServiceField = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const { error } = await supabase.from("coach_services").update(patch).eq("id", id);
      if (error) {
        console.error("Auto-save failed:", error.message);
        return false;
      }
      setSelectedService((prev: any) => (prev?.id === id ? { ...prev, ...patch } : prev));
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      return true;
    },
    [supabase]
  );

  useEffect(() => {
    if (!isEditingInfo || !selectedService?.id) return;
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => {
      persistServiceField(selectedService.id, { title: editForm.title ?? "" });
    }, 500);
    return () => {
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    };
  }, [editForm.title, isEditingInfo, selectedService?.id, persistServiceField]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const [{ data: servicesData }, { data: pendingLeads }] = await Promise.all([
      supabase.from("coach_services").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }),
      supabase.from("coach_enquiries").select("service_id").eq("coach_id", coachId).eq("status", "pending")
    ]);
    setServices(servicesData || []);
    setPendingServiceIds(new Set((pendingLeads || []).map((l: any) => l.service_id)));
    setLoading(false);
  }, [coachId, supabase]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleOpenDetail = useCallback(async (srv: any) => {
    setSelectedService(srv);
    setEditForm({
      ...srv,
      districts: normalizeDistrictIds(srv.districts, srv.location),
      subdistricts: normalizeSubdistrictIds(srv.subdistricts),
      teaching_experience_years: srv.teaching_experience_years ?? "",
    });
    setIsEditingInfo(false);
    setDetailTab("info");
    setPendingServiceIds((prev) => {
      const next = new Set(prev);
      next.delete(srv.id);
      return next;
    });
    await supabase.from("coach_enquiries").update({ status: "seen" }).eq("service_id", srv.id).eq("status", "pending");
  }, [supabase]);

  useEffect(() => {
    if (!deepLinkServiceId || loading) return;
    if (openedDeepLinkRef.current === deepLinkServiceId) return;

    const openDeepLinkedService = async () => {
      const fromList = services.find((s) => s.id === deepLinkServiceId);
      if (fromList) {
        openedDeepLinkRef.current = deepLinkServiceId;
        await handleOpenDetail(fromList);
        return;
      }
      const { data } = await supabase
        .from("coach_services")
        .select("*")
        .eq("id", deepLinkServiceId)
        .eq("coach_id", coachId)
        .single();
      if (data) {
        openedDeepLinkRef.current = deepLinkServiceId;
        await handleOpenDetail(data);
      }
    };

    openDeepLinkedService();
  }, [deepLinkServiceId, loading, services, coachId, supabase, handleOpenDetail]);

  const fetchCourseLeads = useCallback(async (serviceId: string) => {
    const { data: rawLeads, error } = await supabase
      .from("coach_enquiries")
      .select("*")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("讀取課程諮詢單失敗:", error.message);
      setCourseLeads([]);
      return;
    }

    if (!rawLeads?.length) {
      setCourseLeads([]);
      return;
    }

    const enriched = await Promise.all(rawLeads.map(async (lead) => {
      const { data: student } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", lead.student_id)
        .single();
      return { ...lead, student: student || null };
    }));
    setCourseLeads(enriched);
  }, [supabase]);

  useEffect(() => {
    if (!selectedService) return;
    const fetchSubData = async () => {
      setLoadingSubData(true);
      const { data: revs, error: revErr } = await supabase
        .from("coach_reviews")
        .select("*, student:profiles!student_id(full_name, avatar_url)")
        .eq("service_id", selectedService.id)
        .order("created_at", { ascending: false });
      if (revErr) console.error("讀取評價失敗:", revErr.message);
      setCourseReviews(revs || []);
      await fetchCourseLeads(selectedService.id);
      setLoadingSubData(false);
    };
    fetchSubData();
  }, [selectedService, supabase, fetchCourseLeads]);

  useEffect(() => {
    if (!selectedService || detailTab !== "leads") return;
    fetchCourseLeads(selectedService.id);
  }, [detailTab, selectedService, fetchCourseLeads]);

  const handleCreateNewService = async () => {
    const payload = {
      coach_id: coachId,
      title: "",
      sport_category: "volleyball",
      hourly_rate: 0,
      districts: [],
      subdistricts: [],
      description: "",
      photos: [],
      is_active: false,
      teaching_experience_years: null,
    };
    const { data, error } = await supabase.from("coach_services").insert(payload).select().single();
    if (error) { alert("新增失敗: " + error.message); return; }
    if (data) {
      setServices([data, ...services]);
      setSelectedService(data);
      setEditForm({ ...data, districts: [], subdistricts: [], teaching_experience_years: "" });
      setIsEditingInfo(true);
      setDetailTab("info");
    }
  };

  const handleSaveCourseInfo = async (publish: boolean) => {
    setIsSavingInfo(true);
    const districts = Array.isArray(editForm.districts) ? editForm.districts : [];
    if (publish && !districts.length) {
      setIsSavingInfo(false);
      alert("發佈前請至少選擇一個授課地區");
      return;
    }
    if (publish && !editForm.sport_category) {
      setIsSavingInfo(false);
      alert("發佈前請選擇專項類別");
      return;
    }
    const payload = {
      title: (editForm.title ?? "").trim(),
      sport_category: editForm.sport_category,
      hourly_rate: Number(editForm.hourly_rate) || 0,
      districts,
      subdistricts: normalizeSubdistrictIds(editForm.subdistricts),
      description: editForm.description || "",
      is_active: publish,
      teaching_experience_years: editForm.teaching_experience_years
        ? Number(editForm.teaching_experience_years)
        : null,
      location: formatDistrictList(districts, 4) || null,
    };
    const { error } = await supabase.from("coach_services").update(payload).eq("id", editForm.id);
    setIsSavingInfo(false);
    if (error) { alert("更新失敗: " + error.message); return; }
    const updated = { ...editForm, ...payload };
    setSelectedService(updated);
    setServices(services.map((s) => (s.id === editForm.id ? updated : s)));
    setIsEditingInfo(false);
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("確定刪除此課程專案嗎？")) return;
    await supabase.from("coach_services").delete().eq("id", id);
    setServices(services.filter(s => s.id !== id)); setSelectedService(null);
  };

  const handleDeleteReview = async (revId: string) => {
    if (!confirm("確定要刪除這條學員評價嗎？")) return;
    const { error } = await supabase.from("coach_reviews").delete().eq("id", revId);
    if (error) { alert("刪除失敗: " + error.message); return; }
    setCourseReviews(courseReviews.filter(r => r.id !== revId));
  };

  const toggleLeadContacted = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "contacted" ? "seen" : "contacted";
    const { error } = await supabase.from("coach_enquiries").update({ status: newStatus }).eq("id", id);
    if (error) { alert("狀態更新失敗: " + error.message); return; }
    setCourseLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("確定要刪除此諮詢單嗎？此動作無法復原。")) return;
    const { error } = await supabase.from("coach_enquiries").delete().eq("id", id);
    if (error) { alert("刪除失敗: " + error.message); return; }
    setCourseLeads(prev => prev.filter(l => l.id !== id));
  };

  const handleUploadPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedService) return;
    setUploadingMedia(true);
    const updatedPhotos = [...(selectedService.photos || [])];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = `${coachId}/services/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
      const { error } = await supabase.storage.from("highlights").upload(filePath, file);
      if (!error) { const { data } = supabase.storage.from("highlights").getPublicUrl(filePath); updatedPhotos.push(data.publicUrl); }
    }
    await supabase.from("coach_services").update({ photos: updatedPhotos }).eq("id", selectedService.id);
    const updated = { ...selectedService, photos: updatedPhotos };
    setSelectedService(updated); setServices(services.map(s => s.id === updated.id ? updated : s));
    setUploadingMedia(false);
  };

  const handleRemovePhoto = async (idx: number) => {
    if (!selectedService) return;
    const updatedPhotos = selectedService.photos.filter((_: any, i: number) => i !== idx);
    await supabase.from("coach_services").update({ photos: updatedPhotos }).eq("id", selectedService.id);
    const updated = { ...selectedService, photos: updatedPhotos };
    setSelectedService(updated); setServices(services.map(s => s.id === updated.id ? updated : s));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-400" /> 獨立課程與教學專案管理</h3>
          <p className="text-xs text-zinc-400 mt-1">建立的課程將展示於教練名師榜大廳與個人檔案，供學員預約洽詢。</p>
        </div>
        <button onClick={handleCreateNewService} type="button" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95">
          <Plus className="w-4 h-4" /> 新增獨立課程
        </button>
      </div>

      {!selectedService ? (
        loading ? (
          <div className="py-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-blue-500" /> 載入課程卡片中...</div>
        ) : services.length === 0 ? (
          <div className="py-14 text-center bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
            <p className="text-sm text-zinc-400 mb-1">您目前沒有開立任何獨立課程專案。</p>
            <p>點擊右上方「＋ 新增獨立課程」開始建立！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map(srv => (
              <div key={srv.id} onClick={() => handleOpenDetail(srv)} className="relative bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 flex flex-col justify-between transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-2xl cursor-pointer overflow-hidden">
                {pendingServiceIds.has(srv.id) && <span className="absolute top-4 right-4 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10 animate-pulse" />}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SportCategoryBadge category={srv.sport_category} variant="amber" size="xs" />
                      <ServicePublishBadge isActive={!!srv.is_active} />
                    </div>
                    <span className="text-base font-black text-emerald-400">HK$ {srv.hourly_rate} <span className="text-xs text-zinc-500 font-normal">/小時</span></span>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white group-hover:text-amber-400 transition line-clamp-1">{srv.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 h-8 leading-snug">{stripHtml(srv.description || "") || "尚無詳細大綱介紹。"}</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {formatDistrictList(normalizeDistrictIds(srv.districts, srv.location), 2) || "未設定地區"}
                    </span>
                  </div>
                </div>
                <div className="pt-4 mt-5 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-bold">實況照 ({srv.photos?.length || 0})</span>
                  <span className="text-xs font-black text-amber-400 group-hover:underline">管理此專案 →</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <button onClick={() => setSelectedService(null)} type="button" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> 返回課程列表
            </button>
            <div className="flex items-center gap-3">
              <Link href={`/coaches/services/${selectedService.id}`} target="_blank" className="text-xs font-bold text-blue-400 hover:underline">↗ 預覽公開頁面</Link>
              <button onClick={() => handleDeleteCourse(selectedService.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">課程管理後台</span>
              <h2 className="text-2xl font-black text-white mt-1">{selectedService.title || "未命名課程"}</h2>
            </div>
            {!isEditingInfo && detailTab === "info" && (
              <button onClick={() => setIsEditingInfo(true)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer">
                <Edit3 className="w-3.5 h-3.5" /> 編輯基本資料
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
  {([
    { id: "info", label: "資訊" },
    { id: "reviews", label: `評價 (${courseReviews.length})` },
    { id: "media", label: `相簿 (${selectedService.photos?.length || 0})` },
    { id: "leads", label: `諮詢 (${courseLeads.length})` },
  ] as const).map(t => (
    <button
      key={t.id}
      onClick={() => setDetailTab(t.id)}
      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition cursor-pointer ${
        detailTab === t.id
          ? "bg-amber-600 text-white shadow-md"
          : "text-zinc-500 hover:text-white hover:bg-slate-800/50"
      }`}
    >
      <span className="text-[12px] font-black leading-tight">{t.label}</span>
    </button>
  ))}
</div>

          {detailTab === "info" && (isEditingInfo ? (
            <div className="space-y-5 pt-2">
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">課程標題</label>
                <input
                  type="text"
                  value={editForm.title ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="例如：成人籃球基礎班"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold placeholder:text-zinc-600"
                />
                <p className="text-[10px] text-zinc-600 mt-1">輸入時自動儲存</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-bold uppercase block">專項類別</label>
                <SportCategoryPicker
                  value={editForm.sport_category || ""}
                  onChange={(id: SportCategoryId) => setEditForm({ ...editForm, sport_category: id })}
                  accent="amber"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">授課時薪 (HKD/小時)</label>
                  <input
                    type="number"
                    value={editForm.hourly_rate ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        hourly_rate: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    placeholder="500"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-emerald-400 font-black placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">教學年資（年）</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.teaching_experience_years ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        teaching_experience_years: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    placeholder="例如：8"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold placeholder:text-zinc-600"
                  />
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-3">授課地區</label>
                <HKDistrictPicker
                  districts={editForm.districts || []}
                  subdistricts={editForm.subdistricts || []}
                  onDistrictsChange={() => {}}
                  onSubdistrictsChange={() => {}}
                  onSelectionChange={(d, s) => setEditForm((prev: any) => ({ ...prev, districts: d, subdistricts: s }))}
                  hideSectionTitle
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">課程大綱與介紹</label>
                <RichTextEditor
                  value={editForm.description ?? ""}
                  onChange={(html) => setEditForm({ ...editForm, description: html })}
                  placeholder="描述教學目標、適合對象、課堂內容…"
                />
              </div>
              <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                <ServicePublishBadge isActive={!!editForm.is_active} />
                <span className="text-xs font-bold text-zinc-400">
                  {editForm.is_active ? "此課程目前為發佈狀態" : "此課程目前為草稿（不會顯示於名師榜）"}
                </span>
              </label>
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button onClick={() => setIsEditingInfo(false)} type="button" className="px-5 py-2.5 rounded-xl bg-slate-800 text-zinc-400 font-bold text-xs cursor-pointer">取消</button>
                <button onClick={() => handleSaveCourseInfo(false)} disabled={isSavingInfo} type="button" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 font-black text-xs transition cursor-pointer">
                  {isSavingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : null} 儲存草稿
                </button>
                <button onClick={() => handleSaveCourseInfo(true)} disabled={isSavingInfo} type="button" className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer">
                  {isSavingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 儲存並發佈
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div><span className="text-xs text-zinc-500 block font-bold mb-1">專項類別</span><SportCategoryBadge category={selectedService.sport_category} variant="amber" /></div>
                <div><span className="text-xs text-zinc-500 block font-bold">授課收費</span><span className="font-extrabold text-emerald-400">${selectedService.hourly_rate} HKD / 小時</span></div>
                <div><span className="text-xs text-zinc-500 block font-bold">授課地區</span><span className="font-extrabold text-white">{formatDistrictList(normalizeDistrictIds(selectedService.districts, selectedService.location), 4) || "—"}</span></div>
                {selectedService.subdistricts?.length > 0 && (
                  <div><span className="text-xs text-zinc-500 block font-bold">細分區域</span><span className="font-extrabold text-zinc-300 text-sm">{formatSubdistrictList(normalizeSubdistrictIds(selectedService.subdistricts), 5)}</span></div>
                )}
                {selectedService.teaching_experience_years > 0 && (
                  <div><span className="text-xs text-zinc-500 block font-bold">教學年資</span><span className="font-extrabold text-blue-400">{selectedService.teaching_experience_years} 年</span></div>
                )}
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-zinc-500 block font-bold mb-1">詳細課程說明</span>
                <RichBody html={selectedService.description} emptyText="未填寫說明。" />
              </div>
            </div>
          ))}

          {detailTab === "reviews" && (
            <div className="space-y-4 pt-2">
              {loadingSubData ? <div className="py-8 text-center text-zinc-500 text-xs">載入評價中...</div>
                : courseReviews.length === 0 ? <div className="py-10 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">本課程目前尚未收到學員評價。</div>
                : courseReviews.map(rev => (
                  <div key={rev.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 bg-cover bg-center shrink-0 border border-slate-700" style={rev.student?.avatar_url ? { backgroundImage: `url(${rev.student.avatar_url})` } : undefined} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{rev.student?.full_name || "學員"}</span>
                          <span className="text-xs text-amber-400 font-black">{"★".repeat(rev.rating)}</span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1">{rev.comment}</p>
                        <span className="text-[10px] text-zinc-500 mt-1 block">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteReview(rev.id)} className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs transition shrink-0 cursor-pointer">刪除評論</button>
                  </div>
                ))}
            </div>
          )}

          {detailTab === "media" && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-bold">上傳精彩的實況照，有助於大幅提高學員諮詢意願！</span>
                <label className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 transition">
                  {uploadingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  {uploadingMedia ? "上傳中..." : "＋ 選擇相片上傳"}
                  <input type="file" accept="image/*" multiple onChange={e => handleUploadPhoto(e.target.files)} className="hidden" />
                </label>
              </div>
              {selectedService.photos?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  {selectedService.photos.map((url: string, idx: number) => (
                    <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 group">
                      <Image src={url} alt="Showcase" fill className="object-cover" />
                      <button type="button" onClick={() => handleRemovePhoto(idx)} className="absolute inset-0 bg-red-950/80 text-white font-black text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">刪除此相片</button>
                    </div>
                  ))}
                </div>
              ) : <div className="py-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">本課程尚無相片，請點擊上方按鈕開始上傳。</div>}
            </div>
          )}

          {detailTab === "leads" && (
            <div className="space-y-4 pt-2">
              {loadingSubData ? <div className="py-8 text-center text-zinc-500 text-xs">載入詢問單中...</div>
                : courseLeads.length === 0 ? <div className="py-10 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">這堂課目前尚未收到諮詢單。</div>
                : courseLeads.map(lead => (
                  <div key={lead.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Link href={`/p/${lead.student?.id || lead.student_id}`} className="shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-800 bg-cover bg-center shrink-0 border border-slate-700" style={lead.student?.avatar_url ? { backgroundImage: `url(${lead.student.avatar_url})` } : undefined} />
                      </Link>
                      <div className="min-w-0">
                        <Link href={`/p/${lead.student?.id || lead.student_id}`} className="font-bold text-sm text-white hover:text-amber-400 transition">{lead.student?.full_name || "學員"}</Link>
                        <p className="text-xs text-zinc-300 mt-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">💬 {lead.message}</p>
                        <span className="text-[10px] text-zinc-500 mt-1 block">{new Date(lead.created_at).toLocaleString("zh-HK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {lead.status === "contacted" ? (
                        <button onClick={() => toggleLeadContacted(lead.id, lead.status)} className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 hover:text-zinc-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer">
                          <CheckCircle2 className="w-4 h-4" /> 已標記聯絡 <RotateCcw className="w-3 h-3 text-zinc-400" />
                        </button>
                      ) : (
                        <button onClick={() => toggleLeadContacted(lead.id, lead.status)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-md">標記為已聯絡</button>
                      )}
                      <button onClick={() => handleDeleteLead(lead.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer" title="刪除諮詢單">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function CoachSettingsPanel({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  const supabase = createSupabaseBrowserClient();
  const [form, setForm] = useState({
    coach_bio: profile?.coach_bio || "",
    contact_email: profile?.contact_email || "",
    contact_phone: profile?.contact_phone || "",
    coach_service_centre: profile?.coach_service_centre || "",
    coach_districts: normalizeDistrictIds(profile?.coach_districts, profile?.city_region),
    coach_subdistricts: normalizeSubdistrictIds(profile?.coach_subdistricts),
    coach_teaching_experience_years: profile?.coach_teaching_experience_years ?? "",
    address: profile?.address || "",
    is_address_public: profile?.is_address_public ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      coach_bio: form.coach_bio || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      coach_service_centre: form.coach_service_centre || null,
      coach_districts: form.coach_districts,
      coach_subdistricts: form.coach_subdistricts,
      coach_teaching_experience_years: form.coach_teaching_experience_years
        ? Number(form.coach_teaching_experience_years)
        : null,
      city_region: formatDistrictList(form.coach_districts, 3) || null,
      address: form.address || null,
      is_address_public: form.is_address_public,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) { alert("儲存失敗: " + error.message); return; }
    alert("✅ 教練名片設定已儲存！");
    onSaved();
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
      <div className="pb-6 border-b border-slate-800">
        <h3 className="text-sm md:text-base font-black text-white mb-1">專業教學導讀 (Coach Bio)</h3>
        <p className="text-[10px] md:text-xs text-zinc-500 mb-3">此自介獨立於您的運動員自介，將對外顯示在您的教練名片頂端。</p>
        <RichTextEditor
          variant="compact"
          enableImages={false}
          value={form.coach_bio}
          onChange={(html) => setForm({ ...form, coach_bio: html })}
          placeholder={`建議 ${BIO_CHAR_SUGGESTED_RANGE} 字，簡潔有力地介紹您的教學專長與資歷…`}
          showCharCount
          suggestedLength={BIO_CHAR_SUGGESTED_MAX}
        />
      </div>
      <div>
        <h3 className="text-sm md:text-base font-black text-white mb-1">對外聯絡與服務地點</h3>
        <p className="text-[10px] md:text-xs text-zinc-500 mb-4">填寫後的聯絡方式將於學員點擊洽詢預約時呈現。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡信箱</label>
            <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="coach@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 transition outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡電話 (選填)</label>
            <input type="tel" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="+852 9876 5432" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 transition outline-none" />
          </div>
        </div>
        <div className="mb-5">
          <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1 mb-3">主要服務地區</label>
          <HKDistrictPicker
            districts={form.coach_districts}
            subdistricts={form.coach_subdistricts}
            onDistrictsChange={() => {}}
            onSubdistrictsChange={() => {}}
            onSelectionChange={(d, s) => setForm((prev) => ({ ...prev, coach_districts: d, coach_subdistricts: s }))}
            hideSectionTitle
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">服務中心名稱 (選填)</label>
            <input
              type="text"
              value={form.coach_service_centre}
              onChange={(e) => setForm({ ...form, coach_service_centre: e.target.value })}
              placeholder="例如：精英運動訓練中心"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 transition outline-none placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">教學年資（年）</label>
            <input
              type="number"
              min={0}
              value={form.coach_teaching_experience_years}
              onChange={(e) => setForm({ ...form, coach_teaching_experience_years: e.target.value })}
              placeholder="例如：10"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 transition outline-none placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">詳細地址 (場館/工作室)</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="例如：彌敦道 123 號 4 樓"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 transition outline-none placeholder:text-zinc-600"
            />
          </div>
        </div>
        <label className="flex items-center gap-3.5 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-900 transition-colors">
          <input type="checkbox" checked={form.is_address_public} onChange={e => setForm({ ...form, is_address_public: e.target.checked })} className="w-4 h-4 rounded border-slate-700 text-amber-500 bg-slate-950" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-200">對外公開詳細地址</span>
            <span className="text-[10px] md:text-xs text-slate-500">關閉後，名片上將只顯示「主要服務地區」，保護您的私人隱私。</span>
          </div>
        </label>
      </div>
      <div className="flex justify-end pt-2 border-t border-slate-800/80">
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black px-8 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "儲存中..." : "儲存名片設定"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function CoachDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [subTab, setSubTab] = useState<"settings" | "services" | "inbox">(() => {
    const s = searchParams.get("subtab");
    if (s === "inbox" || s === "services" || s === "settings") return s;
    return "settings";
  });

  useEffect(() => {
    const s = searchParams.get("subtab");
    const serviceId = searchParams.get("service");
    if (serviceId) setSubTab("services");
    else if (s === "inbox" || s === "services" || s === "settings") setSubTab(s);
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!prof?.is_coach) { router.push("/profile"); return; }
      setProfile(prof);
      setLoading(false);
    };
    init();
  }, [supabase, router]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono text-sm">載入教練後台中...</div>;
  if (!profile) return null;

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push("/profile")} className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> 返回個人檔案
          </button>
          <Link href={`/p/${profile.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition">
            預覽公開名片 <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            {profile.avatar_url && <div className="w-14 h-14 rounded-2xl bg-cover bg-center border border-slate-700 shrink-0" style={{ backgroundImage: `url(${profile.avatar_url})` }} />}
            <div>
              <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-0.5">教練專屬後台</p>
              <h1 className="text-2xl md:text-3xl font-black text-white">{profile.full_name || profile.first_name}</h1>
              <p className="text-xs text-zinc-500 mt-0.5">@{profile.handle} · 教練管理中心</p>
            </div>
          </div>
        </div>

        {/* ── Sub tabs ── */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 mb-8">
          {([
            { id: "settings", icon: <Settings className="w-4 h-4 shrink-0" />, label: "教練名片設定" },
            { id: "services", icon: <BookOpen className="w-4 h-4 shrink-0" />, label: "獨立課程管理" },
            { id: "inbox",    icon: <Inbox    className="w-4 h-4 shrink-0" />, label: "潛在學生收件匣" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)} className={`py-3 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer ${subTab === t.id ? "bg-amber-600 text-white shadow-md" : "text-zinc-400 hover:text-white hover:bg-slate-800/50"}`}>
              {t.icon}<span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {subTab === "settings" && (
  <CoachSettingsPanel
    profile={profile}
    onSaved={async () => {
      const { data: updated } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .single();
      if (updated) setProfile(updated);
    }}
  />
)}
        {subTab === "services" && <CoachServicesManager coachId={profile.id} />}
        {subTab === "inbox"    && <CoachEnquiriesInbox coachId={profile.id} />}
      </div>
    </div>
  );
}

function CoachDashboardWithSuspense() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入中...</div>}>
      <CoachDashboardContent />
    </Suspense>
  );
}

export default dynamic(() => Promise.resolve(CoachDashboardWithSuspense), { ssr: false });
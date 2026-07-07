"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HKDistrictPicker } from "@/components/location/HKDistrictPicker";
import {
  formatDistrictList,
  normalizeDistrictIds,
  normalizeSubdistrictIds,
} from "@/lib/hk-locations";
import { 
  CheckCircle2, Plus, Trash2, Save, Loader2, 
  UploadCloud, RotateCcw, ArrowLeft, Edit3, MapPin, Settings, BookOpen, Inbox
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { profileLink } from "@/lib/profile-links";
import { useProfileReturnTo } from "@/lib/use-profile-return-to";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { RichBody } from "@/components/content/RichBody";
import { BIO_CHAR_SUGGESTED_MAX, BIO_CHAR_SUGGESTED_RANGE } from "@/lib/content/body";
import { SportCategoryBadge } from "@/components/sports/SportCategoryBadge";
import { SportCategoryPicker } from "@/components/sports/SportCategoryPicker";
import type { SportCategoryId } from "@/lib/sports-categories";
import { stripHtml } from "@/lib/content/body";
import { ServicePublishBadge } from "@/components/services/ServicePublishBadge";
import { ImageCropModal } from "@/components/media/ImageCropModal";
import { readFileAsDataUrl } from "@/lib/image-crop";
import { CoachPricingFields } from "@/components/coach/CoachPricingFields";
import {
  formatCoachServicePrice,
  normalizeCoachPricingMode,
  coachPricingModeLabel,
} from "@/lib/coach-pricing";

interface CoachTabProps {
  editForm?: any; 
  onFieldChange?: (field: string, value: any) => void;
  onSaveGlobal?: () => void; 
  isSaving?: boolean;       
}

// 1. 全局潛在學生諮詢收件匣 (Global Leads Inbox)
function CoachEnquiriesInbox({ fallbackCoachId }: { fallbackCoachId?: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const returnTo = useProfileReturnTo();

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = user?.id || fallbackCoachId;
      if (!targetId) { setLoading(false); return; }

      const { data: rawLeads, error } = await supabase
        .from("coach_enquiries")
        .select("*")
        .eq("coach_id", targetId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("讀取諮詢單失敗:", error.message);
      }

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
    const newStatus = currentStatus === "contacted" ? "seen" : "contacted";
    const { error } = await supabase.from("coach_enquiries").update({ status: newStatus }).eq("id", id);
    if (error) {
      alert("狀態更新失敗: " + error.message);
      return;
    }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fadeIn">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-orange-400" />
            潛在學生諮詢單名單 (Global Leads Inbox)
          </h3>
          <p className="text-xs text-zinc-500 mt-1">學員在您的各個課程卡片點擊「預約諮詢」時，所有諮詢單將統一匯聚於此。</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-500/10 text-orange-400 border border-orange-500/20">
          共 {leads.length} 筆
        </span>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-mono flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> 載入詢問單中...
          </div>
        ) : leads.length === 0 ? (
          <div className="py-14 text-center bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold space-y-1">
            <p className="text-sm text-zinc-400">目前尚無新進的學員諮詢單。</p>
            <p>當學員發送詢問後，您將立即在此收到通知與訊息內容。</p>
          </div>
        ) : (
          leads.map(lead => (
            <div key={lead.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:border-slate-700">
              <div className="flex items-start gap-3.5 min-w-0">
                <Link href={profileLink(lead.student?.id || lead.student_id, returnTo)} className="shrink-0 cursor-pointer">
                  <div className="w-11 h-11 rounded-full bg-slate-800 bg-cover bg-center border border-slate-700" style={lead.student?.avatar_url ? { backgroundImage: `url(${lead.student.avatar_url})` } : undefined} />
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={profileLink(lead.student?.id || lead.student_id, returnTo)} className="font-bold text-sm text-white hover:text-orange-400 transition cursor-pointer">
                      {lead.student?.full_name || "未知運動員"}
                    </Link>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                      諮詢：{lead.service?.title || "專項課程"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800 leading-relaxed">💬 「{lead.message}」</p>
                  <span className="text-[10px] text-zinc-500 mt-1.5 block">送出時間：{new Date(lead.created_at).toLocaleString("zh-HK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {lead.status === "contacted" ? (
                  <button onClick={() => toggleContacted(lead.id, lead.status)} className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 hover:text-zinc-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer" title="點擊改回未標記">
                    <CheckCircle2 className="w-4 h-4" /> <span>已標記聯絡</span>
                    <RotateCcw className="w-3 h-3 ml-0.5 text-zinc-400" />
                  </button>
                ) : (
                  <button onClick={() => toggleContacted(lead.id, lead.status)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-md">
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

// 2. 獨立課程與服務專屬管理模組
function CoachServicesManager() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const returnTo = useProfileReturnTo();

  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "reviews" | "media" | "leads">("info");

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [courseReviews, setCourseReviews] = useState<any[]>([]);
  const [courseLeads, setCourseLeads] = useState<any[]>([]);
  const [loadingSubData, setLoadingSubData] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
  
    const [{ data: servicesData }, { data: pendingLeads }] = await Promise.all([
      supabase.from("coach_services").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }),
      supabase.from("coach_enquiries").select("service_id").eq("coach_id", user.id).eq("status", "pending")
    ]);
  
    setServices(servicesData || []);
    const ids = new Set<string>((pendingLeads || []).map((l: any) => l.service_id));
    setPendingServiceIds(ids);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  useEffect(() => {
    const fetchSubData = async () => {
      if (!selectedService) return;
      setLoadingSubData(true);

      const [revRes, leadRes] = await Promise.all([
        supabase.from("coach_reviews").select("*, student:profiles!student_id(full_name, avatar_url)").eq("service_id", selectedService.id).order("created_at", { ascending: false }),
        supabase.from("coach_enquiries").select("*, student:profiles!student_id(full_name, avatar_url)").eq("service_id", selectedService.id).order("created_at", { ascending: false })
      ]);

      setCourseReviews(revRes.data || []);
      setCourseLeads(leadRes.data || []);
      setLoadingSubData(false);
    };
    fetchSubData();
  }, [selectedService, supabase]);

  const handleCreateNewService = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("請先登入");

    const newServicePayload = {
      coach_id: user.id,
      title: "",
      sport_category: "volleyball",
      hourly_rate: 0,
      pricing_mode: "hourly",
      districts: [],
      subdistricts: [],
      description: "",
      photos: [],
      is_active: false,
      teaching_experience_years: null,
    };

    const { data, error } = await supabase.from("coach_services").insert(newServicePayload).select().single();
    if (error) {
      alert("新增失敗: " + error.message);
    } else if (data) {
      setServices([data, ...services]);
      setSelectedService(data);
      setEditForm({ ...data, districts: [], subdistricts: [], teaching_experience_years: "" });
      setIsEditingInfo(true);
      setDetailTab("info");
    }
  };

  // ✅ When coach clicks into a card:
  // 1. Remove red dot from local state immediately
  // 2. Mark all pending enquiries for this service as "seen" in the DB
  //    so the dot never comes back on refresh unless a NEW enquiry arrives
  const handleOpenDetail = async (srv: any) => {
    setSelectedService(srv);
    setEditForm({
      ...srv,
      districts: normalizeDistrictIds(srv.districts, srv.location),
      subdistricts: normalizeSubdistrictIds(srv.subdistricts),
      teaching_experience_years: srv.teaching_experience_years ?? "",
    });
    setIsEditingInfo(false);
    setDetailTab("info");
  
    // Remove red dot immediately in UI
    setPendingServiceIds(prev => {
      const next = new Set(prev);
      next.delete(srv.id);
      return next;
    });
  
    // Write "seen" to DB so dot doesn't return on refresh
    await supabase
      .from("coach_enquiries")
      .update({ status: "seen" })
      .eq("service_id", srv.id)
      .eq("status", "pending");
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

    const pricingMode = normalizeCoachPricingMode(editForm.pricing_mode);
    if (publish && pricingMode !== "dm" && !(Number(editForm.hourly_rate) > 0)) {
      setIsSavingInfo(false);
      alert("發佈前請填寫課程標價，或改選「私訊詢價」");
      return;
    }

    const payload = {
      title: (editForm.title ?? "").trim(),
      sport_category: editForm.sport_category,
      pricing_mode: pricingMode,
      hourly_rate: pricingMode === "dm" ? 0 : Number(editForm.hourly_rate) || 0,
      districts,
      subdistricts: normalizeSubdistrictIds(editForm.subdistricts),
      description: editForm.description || "",
      is_active: publish,
      teaching_experience_years: editForm.teaching_experience_years
        ? Number(editForm.teaching_experience_years)
        : null,
    };

    const { error } = await supabase.from("coach_services").update(payload).eq("id", editForm.id);

    setIsSavingInfo(false);
    if (error) {
      alert("更新失敗: " + error.message);
    } else {
      const updated = { ...editForm, ...payload };
      setSelectedService(updated);
      setServices(services.map(s => s.id === editForm.id ? updated : s));
      setIsEditingInfo(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("確定刪除此課程專案嗎？相關諮詢與評價也會移除。")) return;
    await supabase.from("coach_services").delete().eq("id", id);
    setServices(services.filter(s => s.id !== id));
    setSelectedService(null);
  };

  const handleDeleteReview = async (revId: string) => {
    if (!confirm("確定要刪除這條學員評價嗎？此動作不可復原。")) return;
    const { error } = await supabase.from("coach_reviews").delete().eq("id", revId);
    if (error) {
      alert("刪除失敗: " + error.message);
    } else {
      setCourseReviews(courseReviews.filter(r => r.id !== revId));
    }
  };

  const handleUploadPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedService) return;
    setUploadingMedia(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setUploadingMedia(false);

    const updatedPhotos = [...(selectedService.photos || [])];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = `${user.id}/services/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const { error: uploadErr } = await supabase.storage.from("highlights").upload(filePath, file);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("highlights").getPublicUrl(filePath);
        updatedPhotos.push(urlData.publicUrl);
      }
    }

    await supabase.from("coach_services").update({ photos: updatedPhotos }).eq("id", selectedService.id);
    const updatedService = { ...selectedService, photos: updatedPhotos };
    setSelectedService(updatedService);
    setServices(services.map(s => s.id === updatedService.id ? updatedService : s));
    setUploadingMedia(false);
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
    await handleUploadPhoto(dt.files);

    const rest = cropQueue.slice(1);
    if (rest.length > 0) {
      setCropQueue(rest);
      setCropImageSrc(await readFileAsDataUrl(rest[0]));
    } else {
      closeCropModal();
    }
  };

  const handleRemovePhoto = async (idxToRemove: number) => {
    if (!selectedService) return;
    const updatedPhotos = selectedService.photos.filter((_: any, idx: number) => idx !== idxToRemove);
    await supabase.from("coach_services").update({ photos: updatedPhotos }).eq("id", selectedService.id);
    const updatedService = { ...selectedService, photos: updatedPhotos };
    setSelectedService(updatedService);
    setServices(services.map(s => s.id === updatedService.id ? updatedService : s));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-400" />
            獨立課程與教學專案管理
          </h3>
          <p className="text-xs text-zinc-400 mt-1">建立的課程將直接展示於教練名師榜大廳與個人檔案，供學員預約洽詢。</p>
        </div>
        <button 
          onClick={handleCreateNewService} 
          type="button" 
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />新增獨立課程
        </button>
      </div>

      {!selectedService ? (
        loading ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-mono flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> 載入課程卡片中...
          </div>
        ) : services.length === 0 ? (
          <div className="py-14 text-center bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold space-y-1">
            <p className="text-sm text-zinc-400">您目前沒有開立任何獨立課程專案。</p>
            <p>點擊右上方「＋ 新增獨立課程」開始建立您的專屬教練課程！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map(srv => (
              <div
              key={srv.id}
              onClick={() => handleOpenDetail(srv)}
              className="relative bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 rounded-3xl p-6 flex flex-col justify-between transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-2xl cursor-pointer overflow-hidden"
            >
              {/* Red dot — only shows when there are unread pending enquiries */}
              {pendingServiceIds.has(srv.id) && (
                <span className="absolute top-4 right-4 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10 animate-pulse" />
              )}
            
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SportCategoryBadge category={srv.sport_category} variant="orange" size="xs" />
                      <ServicePublishBadge isActive={!!srv.is_active} />
                    </div>
                    {(() => {
                      const p = formatCoachServicePrice(srv);
                      return (
                        <span className={`text-base font-black shrink-0 ${p.isDm ? "text-zinc-400" : "text-emerald-400"}`}>
                          {p.main}
                          {p.unit && (
                            <span className="text-xs text-zinc-500 font-normal ml-0.5">{p.unit}</span>
                          )}
                        </span>
                      );
                    })()}
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-white tracking-tight group-hover:text-orange-400 transition line-clamp-1">
                      {srv.title}
                    </h4>
                    <p className="text-xs text-zinc-400 font-medium mt-1.5 line-clamp-2 h-8 leading-snug">
                      {stripHtml(srv.description) || "尚無詳細大綱介紹。"}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="truncate">
                      {formatDistrictList(normalizeDistrictIds(srv.districts, srv.location), 2) || "未設定地區"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-5 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-bold">實況照 ({srv.photos?.length || 0})</span>
                  <span className="text-xs font-black text-orange-400 group-hover:underline flex items-center gap-1">
                    管理此專案 / 查看後台 →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <button 
              onClick={() => setSelectedService(null)} 
              type="button" 
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> 返回課程列表
            </button>
            <div className="flex items-center gap-3">
              <Link 
                href={`/coaches/services/${selectedService.id}`} 
                target="_blank" 
                className="text-xs font-bold text-blue-400 hover:underline"
              >
                ↗ 預覽公開頁面
              </Link>
              <button 
                onClick={() => handleDeleteCourse(selectedService.id)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                title="刪除課程"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                課程管理後台
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{selectedService.title || "未命名課程"}</h2>
            </div>
            {!isEditingInfo && detailTab === "info" && (
              <button 
                onClick={() => setIsEditingInfo(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> 編輯基本資料
              </button>
            )}
          </div>

          <div className="flex border-b border-slate-800 gap-6 overflow-x-auto pb-1">
            <button onClick={() => setDetailTab("info")} className={`pb-2.5 text-sm font-black transition whitespace-nowrap border-b-2 cursor-pointer ${detailTab === "info" ? "border-orange-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
              📋 課程資訊與編輯
            </button>
            <button onClick={() => setDetailTab("reviews")} className={`pb-2.5 text-sm font-black transition whitespace-nowrap border-b-2 cursor-pointer ${detailTab === "reviews" ? "border-orange-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
              💬 學員評價管理 ({courseReviews.length})
            </button>
            <button onClick={() => setDetailTab("media")} className={`pb-2.5 text-sm font-black transition whitespace-nowrap border-b-2 cursor-pointer ${detailTab === "media" ? "border-orange-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
              🖼️ 實況相簿管理 ({selectedService.photos?.length || 0})
            </button>
            <button onClick={() => setDetailTab("leads")} className={`pb-2.5 text-sm font-black transition whitespace-nowrap border-b-2 cursor-pointer ${detailTab === "leads" ? "border-orange-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
              📬 本課程諮詢名單 ({courseLeads.length})
            </button>
          </div>

          {detailTab === "info" && (
            isEditingInfo ? (
              <div className="space-y-4 pt-2 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
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
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">專項類別</label>
                  <SportCategoryPicker
                    value={editForm.sport_category || ""}
                    onChange={(id: SportCategoryId) => setEditForm({ ...editForm, sport_category: id })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <CoachPricingFields
                      pricingMode={editForm.pricing_mode}
                      price={editForm.hourly_rate}
                      onPricingModeChange={(mode) =>
                        setEditForm({ ...editForm, pricing_mode: mode })
                      }
                      onPriceChange={(value) =>
                        setEditForm({ ...editForm, hourly_rate: value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">教學年資（年）</label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.teaching_experience_years ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, teaching_experience_years: e.target.value === "" ? "" : Number(e.target.value) })}
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
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">課程大綱與介紹</label>
                  <RichTextEditor
                    value={editForm.description ?? ""}
                    onChange={(html) => setEditForm({ ...editForm, description: html })}
                    placeholder="描述教學目標、適合對象、課堂內容..."
                  />
                </div>

                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <ServicePublishBadge isActive={!!editForm.is_active} />
                  <span className="text-xs font-bold text-zinc-400">
                    {editForm.is_active ? "此課程目前為發佈狀態" : "此課程目前為草稿"}
                  </span>
                </label>

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <button onClick={() => setIsEditingInfo(false)} type="button" className="px-5 py-2.5 rounded-xl bg-slate-800 text-zinc-400 font-bold text-xs cursor-pointer">取消</button>
                  <button onClick={() => handleSaveCourseInfo(false)} disabled={isSavingInfo} type="button" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 font-black text-xs transition cursor-pointer">儲存草稿</button>
                  <button onClick={() => handleSaveCourseInfo(true)} disabled={isSavingInfo} type="button" className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer">
                    {isSavingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 儲存並發佈
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <div><span className="text-xs text-zinc-500 block font-bold">專項類別</span><SportCategoryBadge category={selectedService.sport_category} variant="orange" /></div>
                  <div>
                    <span className="text-xs text-zinc-500 block font-bold">授課收費</span>
                    {(() => {
                      const p = formatCoachServicePrice(selectedService);
                      return (
                        <>
                          <span className={`font-extrabold ${p.isDm ? "text-zinc-300" : "text-emerald-400"}`}>
                            {p.main}
                            {p.unit && <span className="text-zinc-500 font-normal text-xs ml-1">{p.unit}</span>}
                          </span>
                          <span className="text-[10px] text-zinc-600 block mt-0.5">
                            {coachPricingModeLabel(selectedService.pricing_mode)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <div><span className="text-xs text-zinc-500 block font-bold">授課地區</span><span className="font-extrabold text-white">{formatDistrictList(normalizeDistrictIds(selectedService.districts, selectedService.location), 4) || "未設定"}</span></div>
                </div>
                {selectedService.teaching_experience_years > 0 && (
                  <div className="text-sm"><span className="text-xs text-zinc-500 font-bold">教學年資 </span><span className="font-extrabold text-blue-400">{selectedService.teaching_experience_years} 年</span></div>
                )}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-zinc-500 block font-bold">詳細課程說明</span>
                  <RichBody html={selectedService.description} emptyText="未填寫說明。" className="text-zinc-300 text-sm leading-relaxed" />
                </div>
              </div>
            )
          )}

          {detailTab === "reviews" && (
            <div className="space-y-4 pt-2">
              {loadingSubData ? (
                <div className="py-8 text-center text-zinc-500 text-xs">載入評價中...</div>
              ) : courseReviews.length === 0 ? (
                <div className="py-10 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
                  本課程目前尚未收到學員評價。
                </div>
              ) : (
                courseReviews.map(rev => (
                  <div key={rev.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Link href={profileLink(rev.student?.id || rev.student_id, returnTo)} className="shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 bg-cover bg-center shrink-0 border border-slate-700" style={rev.student?.avatar_url ? { backgroundImage: `url(${rev.student.avatar_url})` } : undefined} />
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={profileLink(rev.student?.id || rev.student_id, returnTo)} className="font-bold text-sm text-white hover:text-orange-400 transition">{rev.student?.full_name || "學員"}</Link>
                          <span className="text-xs text-orange-400 font-black">{"★".repeat(rev.rating)}</span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1">{rev.comment}</p>
                        <span className="text-[10px] text-zinc-500 mt-1 block">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteReview(rev.id)} 
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs transition shrink-0 cursor-pointer"
                    >
                      刪除評論
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {detailTab === "media" && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-bold">上傳精彩的實況照，有助於大幅提高學員諮詢意願！</span>
                <label className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 transition">
                  {uploadingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  {uploadingMedia ? "上傳中..." : "＋ 選擇相片上傳"}
                  <input type="file" accept="image/*" multiple onChange={(e) => { void startCropQueue(e.target.files); e.target.value = ""; }} className="hidden" />
                </label>
              </div>

              {selectedService.photos && selectedService.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  {selectedService.photos.map((url: string, idx: number) => (
                    <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 group">
                      <Image src={url} alt="Showcase" fill className="object-cover" />
                      <button 
                        type="button" 
                        onClick={() => handleRemovePhoto(idx)} 
                        className="absolute inset-0 bg-red-950/80 text-white font-black text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        刪除此相片
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
                  本課程尚無相片，請點擊上方按鈕開始上傳。
                </div>
              )}
            </div>
          )}

          {detailTab === "leads" && (
            <div className="space-y-4 pt-2">
              {loadingSubData ? (
                <div className="py-8 text-center text-zinc-500 text-xs">載入詢問單中...</div>
              ) : courseLeads.length === 0 ? (
                <div className="py-10 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
                  這堂課目前尚未收到諮詢單。
                </div>
              ) : (
                courseLeads.map(lead => (
                  <div key={lead.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Link href={profileLink(lead.student?.id || lead.student_id, returnTo)} className="shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-800 bg-cover bg-center shrink-0 border border-slate-700" style={lead.student?.avatar_url ? { backgroundImage: `url(${lead.student.avatar_url})` } : undefined} />
                      </Link>
                      <div className="min-w-0">
                        <Link href={profileLink(lead.student?.id || lead.student_id, returnTo)} className="font-bold text-sm text-white hover:text-orange-400 transition block">{lead.student?.full_name || "學員"}</Link>
                        <p className="text-xs text-zinc-300 mt-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">💬 {lead.message}</p>
                        <span className="text-[10px] text-zinc-500 mt-1 block">{new Date(lead.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <ImageCropModal
        open={cropImageSrc !== null}
        imageSrc={cropImageSrc}
        preset="banner"
        filename="service-photo.jpg"
        onCancel={closeCropModal}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}

// 3. 主組件 CoachTab
export function CoachTab({ 
  onSaveGlobal,  
  isSaving,       
  editForm,
  onFieldChange
}: CoachTabProps) {
  const searchParams = useSearchParams();

  // ✅ Auto-navigate to correct subtab when coming from notification bell
  const [subTab, setSubTab] = useState<"settings" | "services" | "inbox">(() => {
    const s = searchParams.get("subtab");
    if (s === "inbox" || s === "services" || s === "settings") return s;
    return "settings";
  });

  useEffect(() => {
    const s = searchParams.get("subtab");
    if (s === "inbox" || s === "services" || s === "settings") {
      setSubTab(s);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-lg md:text-xl font-black text-white">教練專區後台 (Coach Dashboard)</h2>
          <p className="text-[10px] md:text-xs text-zinc-500 mt-1">管理您的專屬教學導讀、獨立課程專案與諮詢單收件匣。</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80">
        <button
          onClick={() => setSubTab("settings")}
          className={`py-3 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            subTab === "settings" ? "bg-orange-600 text-white shadow-md" : "text-zinc-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="truncate">教練名片設定</span>
        </button>

        <button
          onClick={() => setSubTab("services")}
          className={`py-3 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            subTab === "services" ? "bg-orange-600 text-white shadow-md" : "text-zinc-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="truncate">獨立課程管理</span>
        </button>

        <button
          onClick={() => setSubTab("inbox")}
          className={`py-3 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            subTab === "inbox" ? "bg-orange-600 text-white shadow-md" : "text-zinc-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Inbox className="w-4 h-4 shrink-0" />
          <span className="truncate">潛在學生收件匣</span>
        </button>
      </div>

      {subTab === "settings" && editForm && onFieldChange && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-8 shadow-sm animate-fadeIn">
          <div className="mb-6 pb-6 border-b border-slate-800">
            <h3 className="text-sm md:text-base font-black text-white mb-1">專業教學導讀</h3>
            <p className="text-[10px] md:text-xs text-zinc-500 mb-3">此自介獨立於您的運動員自介，將對外顯示在您的教練名片頂端。</p>
            <RichTextEditor
              variant="compact"
              enableImages={false}
              value={editForm.coach_bio || ""}
              onChange={(html) => onFieldChange("coach_bio", html)}
              placeholder={`建議 ${BIO_CHAR_SUGGESTED_RANGE} 字，簡潔有力地介紹您的教學專長與資歷…`}
              showCharCount
              suggestedLength={BIO_CHAR_SUGGESTED_MAX}
            />
          </div>

          <div className="mb-5">
            <h3 className="text-sm md:text-base font-black text-white">對外聯絡與服務地點</h3>
            <p className="text-[10px] md:text-xs text-zinc-500 mt-1">填寫後的聯絡方式將於學員點擊洽詢預約時呈現。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡信箱</label>
              <input type="email" value={editForm.contact_email || ""} onChange={(e) => onFieldChange("contact_email", e.target.value)} placeholder="coach@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 transition outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡電話 (選填)</label>
              <input type="tel" value={editForm.contact_phone || ""} onChange={(e) => onFieldChange("contact_phone", e.target.value)} placeholder="+852 9876 5432" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 transition outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">主要服務地區</label>
              <HKDistrictPicker
                districts={editForm.coach_districts || []}
                subdistricts={editForm.coach_subdistricts || []}
                onDistrictsChange={() => {}}
                onSubdistrictsChange={() => {}}
                onSelectionChange={(d, s) => {
                  onFieldChange("coach_districts", d);
                  onFieldChange("coach_subdistricts", s);
                }}
                hideSectionTitle
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">服務中心名稱 (選填)</label>
              <input
                type="text"
                value={editForm.coach_service_centre || ""}
                onChange={(e) => onFieldChange("coach_service_centre", e.target.value)}
                placeholder="例如：精英運動訓練中心"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 transition outline-none placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">教學年資（年）</label>
              <input
                type="number"
                min={0}
                value={editForm.coach_teaching_experience_years ?? ""}
                onChange={(e) => onFieldChange("coach_teaching_experience_years", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="例如：10"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 transition outline-none placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">詳細地址 (場館/工作室)</label>
              <input type="text" value={editForm.address || ""} onChange={(e) => onFieldChange("address", e.target.value)} placeholder="例如：彌敦道 123 號 4 樓" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 transition outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-3.5 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-900 transition-colors">
            <input type="checkbox" checked={editForm.is_address_public ?? true} onChange={(e) => onFieldChange("is_address_public", e.target.checked)} className="w-4 h-4 rounded border-slate-700 text-orange-500 bg-slate-950" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-200">對外公開詳細地址</span>
              <span className="text-[10px] md:text-xs text-slate-500">關閉後，名片上將只顯示「主要服務地區」，保護您的私人隱私。</span>
            </div>
          </label>

          <div className="flex justify-end mt-8 pt-5 border-t border-slate-800/80">
            <button onClick={onSaveGlobal} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black px-8 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 flex items-center gap-2 cursor-pointer">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "儲存中..." : "儲存名片設定"}
            </button>
          </div>
        </div>
      )}

      {subTab === "services" && (
        <div className="animate-fadeIn">
          <CoachServicesManager />
        </div>
      )}

      {subTab === "inbox" && (
        <div className="animate-fadeIn">
          <CoachEnquiriesInbox fallbackCoachId={editForm?.id || editForm?.user_id} />
        </div>
      )}
    </div>
  );
}
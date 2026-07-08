"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Settings, ClipboardList, Inbox, Save, Loader2,
  Plus, Trash2, UploadCloud, Edit3, MapPin, ArrowUpRight,
  CheckCircle2, RotateCcw
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { HKDistrictPicker } from "@/components/location/HKDistrictPicker";
import {
  formatDistrictList,
  normalizeDistrictIds,
  normalizeSubdistrictIds,
} from "@/lib/hk-locations";
import { PhysioServiceTypePicker, PhysioServiceTypeBadges } from "@/components/physio/PhysioServiceTypePicker";
import { normalizePhysioProfileTags, normalizePhysioServiceTypes, filterPhysioServiceTypeTags } from "@/lib/physio-service-types";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { RichBody } from "@/components/content/RichBody";
import { BIO_CHAR_SUGGESTED_MAX, BIO_CHAR_SUGGESTED_RANGE, stripHtml } from "@/lib/content/body";
import { ServicePublishBadge } from "@/components/services/ServicePublishBadge";
import { ServicePhotoManager } from "@/components/services/ServicePhotoManager";
import { QualificationPicker } from "@/components/qualifications/QualificationPicker";
import { PHYSIO_QUALIFICATIONS, filterPhysioQualificationTags } from "@/lib/qualifications";
import { profileLink } from "@/lib/profile-links";
import { useProfileReturnTo } from "@/lib/use-profile-return-to";
import { CoachPricingFields } from "@/components/coach/CoachPricingFields";
import {
  formatPhysioServicePrice,
  normalizeServicePricingMode,
  physioPricingModeLabel,
} from "@/lib/coach-pricing";

const ENQUIRY_DOT_CLASS =
  "absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10 animate-pulse";

// ─── Physio Enquiries Inbox ───────────────────────────────────────────────────
function PhysioEnquiriesInbox({
  physioId,
  onEnquiriesChanged,
}: {
  physioId: string;
  onEnquiriesChanged?: () => void;
}) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const returnTo = useProfileReturnTo();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: rawLeads, error } = await supabase
        .from("physio_enquiries").select("*").eq("physio_id", physioId).order("created_at", { ascending: false });
      if (error || !rawLeads?.length) { setLeads([]); setLoading(false); return; }
      const enriched = await Promise.all(rawLeads.map(async (lead) => {
        const [{ data: patient }, { data: service }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url").eq("id", lead.patient_id).single(),
          supabase.from("physio_services").select("title, service_type").eq("id", lead.service_id).single()
        ]);
        return { ...lead, patient: patient || null, service: service || null };
      }));
      setLeads(enriched);
      setLoading(false);
    };
    fetch();
  }, [physioId, supabase]);

  const toggleContacted = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "contacted" ? "seen" : "contacted";
    const { error } = await supabase.from("physio_enquiries").update({ status: newStatus }).eq("id", id);
    if (error) { alert("狀態更新失敗: " + error.message); return; }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    onEnquiriesChanged?.();
    window.dispatchEvent(new CustomEvent("sync-physio-enquiries"));
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("確定要刪除此諮詢單嗎？此動作無法復原。")) return;
    const { error } = await supabase.from("physio_enquiries").delete().eq("id", id);
    if (error) { alert("刪除失敗: " + error.message); return; }
    setLeads(prev => prev.filter(l => l.id !== id));
    window.dispatchEvent(new CustomEvent("sync-physio-enquiries"));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2"><Inbox className="w-5 h-5 text-green-400" /> 運動員預約諮詢收件匣</h3>
          <p className="text-xs text-zinc-500 mt-1">運動員點擊「預約諮詢」後，所有預約單統一匯聚於此。</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black bg-green-500/10 text-green-400 border border-green-500/20">共 {leads.length} 筆</span>
      </div>
      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-green-500" /> 載入預約單中...</div>
      ) : leads.length === 0 ? (
        <div className="py-14 text-center bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
          <p className="text-sm text-zinc-400 mb-1">目前尚無新進的預約諮詢單。</p>
          <p>當運動員發送預約後，您將立即在此收到通知。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map(lead => (
            <div key={lead.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition">
              <div className="flex items-start gap-3.5 min-w-0">
                <Link href={profileLink(lead.patient?.id || lead.patient_id, returnTo)} className="shrink-0">
                  <div className="w-11 h-11 rounded-full bg-slate-800 bg-cover bg-center border border-slate-700" style={lead.patient?.avatar_url ? { backgroundImage: `url(${lead.patient.avatar_url})` } : undefined} />
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={profileLink(lead.patient?.id || lead.patient_id, returnTo)} className="font-bold text-sm text-white hover:text-green-400 transition">{lead.patient?.full_name || "未知運動員"}</Link>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 font-bold">預約：{lead.service?.title || "診療項目"}</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800 leading-relaxed">💬 「{lead.message}」</p>
                  <span className="text-[10px] text-zinc-500 mt-1.5 block">送出時間：{new Date(lead.created_at).toLocaleString("zh-HK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap justify-end">
                {lead.service_id && (
                  <Link
                    href={`/dashboard/physio?service=${lead.service_id}`}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-green-500/15 border border-slate-700 hover:border-green-500/40 text-zinc-300 hover:text-green-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> 前往課程
                  </Link>
                )}
                {lead.status === "contacted" ? (
                  <button onClick={() => toggleContacted(lead.id, lead.status)} className="px-3.5 py-2 rounded-xl bg-green-950/60 border border-green-500/40 text-green-400 hover:bg-slate-800 hover:text-zinc-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer">
                    <CheckCircle2 className="w-4 h-4" /> 已標記聯絡 <RotateCcw className="w-3 h-3 text-zinc-400" />
                  </button>
                ) : (
                  <button onClick={() => toggleContacted(lead.id, lead.status)} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition cursor-pointer shadow-md">標記為已聯絡</button>
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

// ─── Physio Services Manager ──────────────────────────────────────────────────
function PhysioServicesManager({
  physioId,
  uncontactedServiceIds,
  onEnquiriesChanged,
}: {
  physioId: string;
  uncontactedServiceIds: Set<string>;
  onEnquiriesChanged: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const returnTo = useProfileReturnTo();
  const deepLinkServiceId = searchParams.get("service");
  const openedDeepLinkRef = useRef<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "reviews" | "media" | "leads">("info");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [serviceReviews, setServiceReviews] = useState<any[]>([]);
  const [serviceLeads, setServiceLeads] = useState<any[]>([]);
  const [loadingSubData, setLoadingSubData] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistServiceField = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const { error } = await supabase.from("physio_services").update(patch).eq("id", id);
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
    const { data: servicesData } = await supabase
      .from("physio_services")
      .select("*")
      .eq("physio_id", physioId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setServices(servicesData || []);
    setLoading(false);
  }, [physioId, supabase]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  useEffect(() => {
    const onSync = () => { fetchServices(); onEnquiriesChanged(); };
    window.addEventListener("sync-physio-enquiries", onSync);
    return () => window.removeEventListener("sync-physio-enquiries", onSync);
  }, [fetchServices, onEnquiriesChanged]);

  const handleOpenDetail = useCallback(async (srv: any) => {
    setSelectedService(srv);
    setEditForm({
      ...srv,
      districts: normalizeDistrictIds(srv.districts, srv.location),
      subdistricts: normalizeSubdistrictIds(srv.subdistricts),
      service_types: normalizePhysioServiceTypes(srv.service_types, srv.service_type),
    });
    setIsEditingInfo(false);
    setDetailTab("info");
  }, []);

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
        .from("physio_services")
        .select("*")
        .eq("id", deepLinkServiceId)
        .eq("physio_id", physioId)
        .single();
      if (data) {
        openedDeepLinkRef.current = deepLinkServiceId;
        await handleOpenDetail(data);
      }
    };

    openDeepLinkedService();
  }, [deepLinkServiceId, loading, services, physioId, supabase, handleOpenDetail]);

  useEffect(() => {
    if (!selectedService) return;
    const fetchSubData = async () => {
      setLoadingSubData(true);
      const [revRes, leadRes] = await Promise.all([
        supabase.from("physio_reviews").select("*, patient:profiles!patient_id(full_name, avatar_url)").eq("service_id", selectedService.id).order("created_at", { ascending: false }),
        supabase.from("physio_enquiries").select("*, patient:profiles!patient_id(full_name, avatar_url)").eq("service_id", selectedService.id).order("created_at", { ascending: false })
      ]);
      setServiceReviews(revRes.data || []);
      setServiceLeads(leadRes.data || []);
      setLoadingSubData(false);
    };
    fetchSubData();
  }, [selectedService, supabase]);

  const handleCreateNewService = async () => {
    const payload = { physio_id: physioId, title: "", service_type: "運動復健", service_types: [] as string[], session_rate: 0, pricing_mode: "session", districts: [], subdistricts: [], description: "", photos: [], draft_photos: [], sort_order: services.length + 1, is_active: false, service_centre: "", full_address: "" };
    const { data, error } = await supabase.from("physio_services").insert(payload).select().single();
    if (error) { alert("新增失敗: " + error.message); return; }
    if (data) { setServices([data, ...services]); setSelectedService(data); setEditForm({ ...data, districts: [], subdistricts: [] }); setIsEditingInfo(true); setDetailTab("info"); }
  };

  const handleSaveServiceInfo = async (publish: boolean) => {
    setIsSavingInfo(true);
    const districts = Array.isArray(editForm.districts) ? editForm.districts : [];
    if (publish && !districts.length) {
      setIsSavingInfo(false);
      alert("發佈前請至少選擇一個診療地區");
      return;
    }
    const serviceTypes = normalizePhysioServiceTypes(editForm.service_types, editForm.service_type);
    if (publish && !serviceTypes.length) {
      setIsSavingInfo(false);
      alert("發佈前請至少選擇一個診療類別");
      return;
    }
    const pricingMode = normalizeServicePricingMode(editForm.pricing_mode || "session");
    if (publish && pricingMode !== "dm" && !(Number(editForm.session_rate) > 0)) {
      setIsSavingInfo(false);
      alert("發佈前請填寫項目標價，或改選「私訊詢價」");
      return;
    }
    const payload = {
      title: (editForm.title ?? "").trim(),
      service_types: serviceTypes,
      service_type: serviceTypes[0] || "運動復健",
      pricing_mode: pricingMode,
      session_rate: pricingMode === "dm" ? 0 : Number(editForm.session_rate) || 0,
      districts,
      subdistricts: normalizeSubdistrictIds(editForm.subdistricts),
      description: editForm.description || "",
      service_centre: (editForm.service_centre ?? "").trim() || null,
      full_address: (editForm.full_address ?? "").trim() || null,
      is_active: publish,
      location: formatDistrictList(districts, 4) || null,
    };
    const { error } = await supabase.from("physio_services").update(payload).eq("id", editForm.id);
    setIsSavingInfo(false);
    if (error) { alert("更新失敗: " + error.message); return; }
    const updated = { ...editForm, ...payload };
    setSelectedService(updated);
    setServices(services.map(s => s.id === editForm.id ? updated : s));
    setIsEditingInfo(false);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("確定刪除此診療項目嗎？")) return;
    await supabase.from("physio_services").delete().eq("id", id);
    setServices(services.filter(s => s.id !== id)); setSelectedService(null);
  };

  const handleDeleteReview = async (revId: string) => {
    if (!confirm("確定要刪除這條評價嗎？")) return;
    const { error } = await supabase.from("physio_reviews").delete().eq("id", revId);
    if (error) { alert("刪除失敗: " + error.message); return; }
    setServiceReviews(serviceReviews.filter(r => r.id !== revId));
  };

  const toggleLeadContacted = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "contacted" ? "seen" : "contacted";
    const { error } = await supabase.from("physio_enquiries").update({ status: newStatus }).eq("id", id);
    if (error) { alert("狀態更新失敗: " + error.message); return; }
    setServiceLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    onEnquiriesChanged();
    window.dispatchEvent(new CustomEvent("sync-physio-enquiries"));
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("確定要刪除此諮詢單嗎？此動作無法復原。")) return;
    const { error } = await supabase.from("physio_enquiries").delete().eq("id", id);
    if (error) { alert("刪除失敗: " + error.message); return; }
    setServiceLeads((prev) => prev.filter((l) => l.id !== id));
    onEnquiriesChanged();
    window.dispatchEvent(new CustomEvent("sync-physio-enquiries"));
  };

  const handleUploadPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedService) return;
    setUploadingMedia(true);
    const updatedDrafts = [...(selectedService.draft_photos || [])];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = `${physioId}/physio/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
      const { error } = await supabase.storage.from("highlights").upload(filePath, file);
      if (!error) {
        const { data } = supabase.storage.from("highlights").getPublicUrl(filePath);
        updatedDrafts.push(data.publicUrl);
      }
    }
    await supabase.from("physio_services").update({ draft_photos: updatedDrafts }).eq("id", selectedService.id);
    const updated = { ...selectedService, draft_photos: updatedDrafts };
    setSelectedService(updated);
    setServices(services.map((s) => (s.id === updated.id ? updated : s)));
    setUploadingMedia(false);
  };

  const handlePublishPhoto = async (url: string) => {
    if (!selectedService) return;
    const draftPhotos = (selectedService.draft_photos || []).filter((p: string) => p !== url);
    const publishedPhotos = [...(selectedService.photos || []), url];
    await supabase
      .from("physio_services")
      .update({ photos: publishedPhotos, draft_photos: draftPhotos })
      .eq("id", selectedService.id);
    const updated = { ...selectedService, photos: publishedPhotos, draft_photos: draftPhotos };
    setSelectedService(updated);
    setServices(services.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeletePhoto = async (url: string, status: "draft" | "published") => {
    if (!selectedService) return;
    if (status === "draft") {
      const draftPhotos = (selectedService.draft_photos || []).filter((p: string) => p !== url);
      await supabase.from("physio_services").update({ draft_photos: draftPhotos }).eq("id", selectedService.id);
      const updated = { ...selectedService, draft_photos: draftPhotos };
      setSelectedService(updated);
      setServices(services.map((s) => (s.id === updated.id ? updated : s)));
      return;
    }
    const publishedPhotos = (selectedService.photos || []).filter((p: string) => p !== url);
    await supabase.from("physio_services").update({ photos: publishedPhotos }).eq("id", selectedService.id);
    const updated = { ...selectedService, photos: publishedPhotos };
    setSelectedService(updated);
    setServices(services.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleMoveService = async (id: string, direction: "up" | "down") => {
    const idx = services.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= services.length) return;
    const a = services[idx];
    const b = services[swapIdx];
    const aOrder = a.sort_order ?? idx + 1;
    const bOrder = b.sort_order ?? swapIdx + 1;
    await Promise.all([
      supabase.from("physio_services").update({ sort_order: bOrder }).eq("id", a.id),
      supabase.from("physio_services").update({ sort_order: aOrder }).eq("id", b.id),
    ]);
    await fetchServices();
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2"><ClipboardList className="w-5 h-5 text-green-400" /> 診療項目與服務管理</h3>
          <p className="text-xs text-zinc-400 mt-1">建立的診療項目將展示於物理治療師名錄與個人檔案，供運動員預約諮詢。</p>
        </div>
        <button onClick={handleCreateNewService} type="button" className="bg-green-700 hover:bg-green-600 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95">
          <Plus className="w-4 h-4" />新增診療項目
        </button>
      </div>

      {!selectedService ? (
        loading ? (
          <div className="py-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-green-500" /> 載入診療項目中...</div>
        ) : services.length === 0 ? (
          <div className="py-14 text-center bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">
            <p className="text-sm text-zinc-400 mb-1">您目前沒有開立任何診療項目。</p>
            <p>點擊右上方「＋ 新增診療項目」開始建立！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map(srv => (
              <div key={srv.id} onClick={() => handleOpenDetail(srv)} className="relative bg-slate-900/90 border border-slate-800 hover:border-green-500/50 rounded-3xl p-6 flex flex-col justify-between transition duration-300 group hover:-translate-y-1 shadow-md hover:shadow-2xl cursor-pointer overflow-hidden">
                {uncontactedServiceIds.has(srv.id) && <span className="absolute top-4 right-4 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10 animate-pulse" />}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5">
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveService(srv.id, "up"); }} className="px-2 py-1 rounded-lg bg-slate-950/90 border border-slate-700 text-zinc-300 text-[10px] font-black">↑</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveService(srv.id, "down"); }} className="px-2 py-1 rounded-lg bg-slate-950/90 border border-slate-700 text-zinc-300 text-[10px] font-black">↓</button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PhysioServiceTypeBadges types={normalizePhysioServiceTypes(srv.service_types, srv.service_type)} size="xs" />
                      <ServicePublishBadge isActive={!!srv.is_active} />
                    </div>
                    {(() => {
                      const p = formatPhysioServicePrice(srv);
                      return (
                        <span className={`text-base font-black shrink-0 ${p.isDm ? "text-zinc-400" : "text-green-400"}`}>
                          {p.main}
                          {p.unit && (
                            <span className="text-xs text-zinc-500 font-normal ml-0.5">{p.unit}</span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white group-hover:text-green-400 transition line-clamp-1">{srv.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 h-8 leading-snug">{stripHtml(srv.description || "") || "尚無詳細說明。"}</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <span className="truncate">{formatDistrictList(normalizeDistrictIds(srv.districts, srv.location), 2) || "未設定地區"}</span>
                  </div>
                </div>
                <div className="pt-4 mt-5 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-bold">診療照 ({srv.photos?.length || 0})</span>
                  <span className="text-xs font-black text-green-400 group-hover:underline">管理此項目 →</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <button onClick={() => setSelectedService(null)} type="button" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> 返回項目列表
            </button>
            <div className="flex items-center gap-3">
              <Link href={`/physio/services/${selectedService.id}`} target="_blank" className="text-xs font-bold text-green-400 hover:underline">↗ 預覽公開頁面</Link>
              <button onClick={() => handleDeleteService(selectedService.id)} className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">診療項目後台</span>
              <h2 className="text-2xl font-black text-white mt-1">{selectedService.title || "未命名項目"}</h2>
            </div>
            {!isEditingInfo && detailTab === "info" && (
              <button onClick={() => setIsEditingInfo(true)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer">
                <Edit3 className="w-3.5 h-3.5" /> 編輯基本資料
              </button>
            )}
          </div>

          <div className="flex border-b border-slate-800 gap-6 overflow-x-auto pb-1">
            {(["info", "reviews", "media", "leads"] as const).map(tab => (
              <button key={tab} onClick={() => setDetailTab(tab)} className={`relative pb-2.5 text-sm font-black transition whitespace-nowrap border-b-2 cursor-pointer ${detailTab === tab ? "border-green-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                {tab === "leads" && uncontactedServiceIds.has(selectedService.id) && (
                  <span className="absolute -top-0.5 right-0 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-950 pointer-events-none" aria-hidden />
                )}
                {tab === "info"    && "📋 項目資訊與編輯"}
                {tab === "reviews" && `💬 運動員評價 (${serviceReviews.length})`}
                {tab === "media"   && `🖼️ 診所相簿 (${(selectedService.photos?.length || 0) + (selectedService.draft_photos?.length || 0)})`}
                {tab === "leads"   && `📬 預約名單 (${serviceLeads.length})`}
              </button>
            ))}
          </div>

          {detailTab === "info" && (isEditingInfo ? (
            <div className="space-y-5 pt-2">
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">項目名稱</label>
                <input
                  type="text"
                  value={editForm.title ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="例如：運動傷患評估與復健"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold placeholder:text-zinc-600"
                />
                <p className="text-[10px] text-zinc-600 mt-1">輸入時自動儲存</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-bold uppercase block">診療類別（可多選）</label>
                <PhysioServiceTypePicker
                  value={normalizePhysioServiceTypes(editForm.service_types, editForm.service_type)}
                  onChange={(types) => setEditForm({ ...editForm, service_types: types, service_type: types[0] || "" })}
                />
              </div>
              <div>
                <CoachPricingFields
                  pricingMode={editForm.pricing_mode || "session"}
                  price={editForm.session_rate}
                  accent="green"
                  audience="patient"
                  onPricingModeChange={(mode) =>
                    setEditForm({ ...editForm, pricing_mode: mode })
                  }
                  onPriceChange={(value) =>
                    setEditForm({ ...editForm, session_rate: value })
                  }
                />
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-3">診療地區</label>
                <HKDistrictPicker
                  districts={editForm.districts || []}
                  subdistricts={editForm.subdistricts || []}
                  onDistrictsChange={() => {}}
                  onSubdistrictsChange={() => {}}
                  onSelectionChange={(d, s) => setEditForm((prev: any) => ({ ...prev, districts: d, subdistricts: s }))}
                  hideSectionTitle
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">服務中心名稱 (選填)</label>
                  <input
                    type="text"
                    value={editForm.service_centre ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, service_centre: e.target.value })}
                    placeholder="例如：Tony Physio 中環店"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">完整地址</label>
                  <input
                    type="text"
                    value={editForm.full_address ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, full_address: e.target.value })}
                    placeholder="例如：中環德輔道中 123 號 5 樓"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold placeholder:text-zinc-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">項目詳細說明</label>
                <RichTextEditor
                  value={editForm.description ?? ""}
                  onChange={(html) => setEditForm({ ...editForm, description: html })}
                  placeholder="描述適合對象、治療流程、注意事項…"
                />
              </div>
              <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                <ServicePublishBadge isActive={!!editForm.is_active} />
                <span className="text-xs font-bold text-zinc-400">
                  {editForm.is_active ? "此項目目前為發佈狀態" : "此項目目前為草稿（不會顯示於個人檔案）"}
                </span>
              </label>
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button onClick={() => setIsEditingInfo(false)} type="button" className="px-5 py-2.5 rounded-xl bg-slate-800 text-zinc-400 font-bold text-xs cursor-pointer">取消</button>
                <button onClick={() => handleSaveServiceInfo(false)} disabled={isSavingInfo} type="button" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 font-black text-xs transition cursor-pointer">
                  儲存草稿
                </button>
                <button onClick={() => handleSaveServiceInfo(true)} disabled={isSavingInfo} type="button" className="px-6 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer">
                  {isSavingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 儲存並發佈
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div><span className="text-xs text-zinc-500 block font-bold mb-1">診療類別</span><PhysioServiceTypeBadges types={normalizePhysioServiceTypes(selectedService.service_types, selectedService.service_type)} size="xs" /></div>
                <div>
                  <span className="text-xs text-zinc-500 block font-bold">項目收費</span>
                  {(() => {
                    const p = formatPhysioServicePrice(selectedService);
                    return (
                      <>
                        <span className={`font-extrabold ${p.isDm ? "text-zinc-300" : "text-green-400"}`}>
                          {p.main}
                          {p.unit && <span className="text-zinc-500 font-normal text-xs ml-1">{p.unit}</span>}
                        </span>
                        <span className="text-[10px] text-zinc-600 block mt-0.5">
                          {physioPricingModeLabel(selectedService.pricing_mode)}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div><span className="text-xs text-zinc-500 block font-bold">診療地區</span><span className="font-extrabold text-white">{formatDistrictList(normalizeDistrictIds(selectedService.districts, selectedService.location), 4) || "未設定"}</span></div>
                {selectedService.service_centre && (
                  <div><span className="text-xs text-zinc-500 block font-bold">服務中心</span><span className="font-extrabold text-green-300">{selectedService.service_centre}</span></div>
                )}
                {selectedService.full_address && (
                  <div className="sm:col-span-2"><span className="text-xs text-zinc-500 block font-bold">完整地址</span><span className="font-extrabold text-white">{selectedService.full_address}</span></div>
                )}
              </div>
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-zinc-500 block font-bold mb-1">詳細說明</span>
                <RichBody html={selectedService.description} emptyText="未填寫說明。" />
              </div>
            </div>
          ))}

          {detailTab === "reviews" && (
            <div className="space-y-4 pt-2">
              {loadingSubData ? <div className="py-8 text-center text-zinc-500 text-xs">載入評價中...</div>
                : serviceReviews.length === 0 ? <div className="py-10 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">此診療項目目前尚未收到評價。</div>
                : serviceReviews.map(rev => (
                  <div key={rev.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Link href={profileLink(rev.patient?.id || rev.patient_id, returnTo)} className="shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 bg-cover bg-center shrink-0 border border-slate-700" style={rev.patient?.avatar_url ? { backgroundImage: `url(${rev.patient.avatar_url})` } : undefined} />
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={profileLink(rev.patient?.id || rev.patient_id, returnTo)} className="font-bold text-sm text-white hover:text-green-400 transition">{rev.patient?.full_name || "運動員"}</Link>
                          <span className="text-xs text-green-400 font-black">{"★".repeat(rev.rating)}</span>
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
            <ServicePhotoManager
              photos={selectedService.photos || []}
              draftPhotos={selectedService.draft_photos || []}
              uploading={uploadingMedia}
              accent="green"
              emptyLabel="此項目尚無相片，請點擊上方按鈕開始上傳。"
              onUpload={handleUploadPhoto}
              onPublish={handlePublishPhoto}
              onDelete={handleDeletePhoto}
            />
          )}

          {detailTab === "leads" && (
            <div className="space-y-4 pt-2">
              {loadingSubData ? <div className="py-8 text-center text-zinc-500 text-xs">載入預約單中...</div>
                : serviceLeads.length === 0 ? <div className="py-10 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-zinc-500 text-xs font-bold">此診療項目目前尚未收到預約單。</div>
                : serviceLeads.map(lead => (
                  <div key={lead.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Link href={profileLink(lead.patient?.id || lead.patient_id, returnTo)} className="shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-800 bg-cover bg-center shrink-0 border border-slate-700" style={lead.patient?.avatar_url ? { backgroundImage: `url(${lead.patient.avatar_url})` } : undefined} />
                      </Link>
                      <div className="min-w-0">
                        <Link href={profileLink(lead.patient?.id || lead.patient_id, returnTo)} className="font-bold text-sm text-white hover:text-green-400 transition">{lead.patient?.full_name || "運動員"}</Link>
                        <p className="text-xs text-zinc-300 mt-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">💬 {lead.message}</p>
                        <span className="text-[10px] text-zinc-500 mt-1 block">{new Date(lead.created_at).toLocaleString("zh-HK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {lead.status === "contacted" ? (
                        <button onClick={() => toggleLeadContacted(lead.id, lead.status)} className="px-3.5 py-2 rounded-xl bg-green-950/60 border border-green-500/40 text-green-400 hover:bg-slate-800 hover:text-zinc-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer">
                          <CheckCircle2 className="w-4 h-4" /> 已標記聯絡 <RotateCcw className="w-3 h-3 text-zinc-400" />
                        </button>
                      ) : (
                        <button onClick={() => toggleLeadContacted(lead.id, lead.status)} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition cursor-pointer shadow-md">標記為已聯絡</button>
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

// ─── Physio Settings Panel ────────────────────────────────────────────────────
function PhysioSettingsPanel({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  const supabase = createSupabaseBrowserClient();
  const [form, setForm] = useState({
    physio_qualifications: profile?.physio_qualifications || "",
    clinic_name: profile?.clinic_name || "",
    physio_experience_years: profile?.physio_experience_years || "",
    physio_service_tags: filterPhysioServiceTypeTags(
      normalizePhysioProfileTags(profile?.physio_service_tags, profile?.physio_services_offered)
    ),
    physio_qualification_tags: filterPhysioQualificationTags(profile?.physio_qualification_tags),
    physio_qualification_custom: profile?.physio_qualification_custom || "",
    physio_contact_email: profile?.physio_contact_email || "",
    physio_contact_phone: profile?.physio_contact_phone || "",
    physio_districts: normalizeDistrictIds(profile?.physio_districts, profile?.physio_city_region),
    physio_subdistricts: normalizeSubdistrictIds(profile?.physio_subdistricts),
    physio_address: profile?.physio_address || "",
    physio_is_address_public: profile?.physio_is_address_public ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      physio_qualifications: form.physio_qualifications || null,
      clinic_name: form.clinic_name || null,
      physio_experience_years: form.physio_experience_years || null,
      physio_service_tags: filterPhysioServiceTypeTags(form.physio_service_tags),
      physio_services_offered: form.physio_service_tags.length
        ? filterPhysioServiceTypeTags(form.physio_service_tags).join("、")
        : null,
      physio_qualification_tags: filterPhysioQualificationTags(form.physio_qualification_tags),
      physio_qualification_custom: form.physio_qualification_custom || null,
      physio_contact_email: form.physio_contact_email || null,
      physio_contact_phone: form.physio_contact_phone || null,
      physio_districts: form.physio_districts,
      physio_subdistricts: form.physio_subdistricts,
      physio_city_region: formatDistrictList(form.physio_districts, 3) || null,
      physio_address: form.physio_address || null,
      physio_is_address_public: form.physio_is_address_public,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) { alert("儲存失敗: " + error.message); return; }
    alert("✅ 治療師名片設定已儲存！");
    onSaved();
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-8 shadow-sm space-y-6">
      {/* Bio */}
      <div className="pb-6 border-b border-slate-800">
        <h3 className="text-sm md:text-base font-black text-white mb-1">治療師專業簡介 (Physio Bio)</h3>
        <p className="text-[10px] md:text-xs text-zinc-500 mb-3">此自介獨立於運動員自介，將對外顯示在您的治療師名片頂端。</p>
        <RichTextEditor
          variant="compact"
          enableImages={false}
          value={form.physio_qualifications}
          onChange={(html) => setForm({ ...form, physio_qualifications: html })}
          placeholder={`建議 ${BIO_CHAR_SUGGESTED_RANGE} 字，簡潔有力地介紹您的專業資歷與治療專長…`}
          showCharCount
          suggestedLength={BIO_CHAR_SUGGESTED_MAX}
        />
      </div>

      <div className="pb-6 border-b border-slate-800">
        <h3 className="text-sm md:text-base font-black text-white mb-1">專業資歷 / 認證</h3>
        <p className="text-[10px] md:text-xs text-zinc-500 mb-4">選擇的資歷將以標籤顯示於治療師名錄；自由填寫的內容顯示於您的公開名片。</p>
        <QualificationPicker
          options={PHYSIO_QUALIFICATIONS}
          selectedTags={form.physio_qualification_tags}
          onTagsChange={(tags) => setForm({ ...form, physio_qualification_tags: tags })}
          customValue={form.physio_qualification_custom}
          onCustomChange={(v) => setForm({ ...form, physio_qualification_custom: v })}
          accent="green"
          customPlaceholder="例如：香港理工大學物理治療系、APTA 會員…"
        />
      </div>

      {/* Clinic info */}
      <div>
        <h3 className="text-sm md:text-base font-black text-white mb-4">診所資訊</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">診所 / 機構名稱</label>
            <input type="text" value={form.clinic_name} onChange={e => setForm({ ...form, clinic_name: e.target.value })} placeholder="例如：運動復健中心" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 transition outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">執業年資</label>
            <input type="text" value={form.physio_experience_years} onChange={e => setForm({ ...form, physio_experience_years: e.target.value })} placeholder="例如：8 年" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 transition outline-none" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">專業服務項目（可多選）</label>
            <p className="text-[10px] text-zinc-600 pl-1 mb-2">將顯示於治療師名片與名錄頁面</p>
            <PhysioServiceTypePicker
              value={form.physio_service_tags}
              onChange={(tags) => setForm({ ...form, physio_service_tags: tags })}
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <h3 className="text-sm md:text-base font-black text-white mb-4">對外聯絡與診所地點</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡信箱</label>
            <input type="email" value={form.physio_contact_email} onChange={e => setForm({ ...form, physio_contact_email: e.target.value })} placeholder="physio@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 transition outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">公開聯絡電話 (選填)</label>
            <input type="tel" value={form.physio_contact_phone} onChange={e => setForm({ ...form, physio_contact_phone: e.target.value })} placeholder="+852 9876 5432" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 transition outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">主要服務地區</label>
            <HKDistrictPicker
              districts={form.physio_districts}
              subdistricts={form.physio_subdistricts}
              onDistrictsChange={() => {}}
              onSubdistrictsChange={() => {}}
              onSelectionChange={(d, s) => setForm((prev) => ({ ...prev, physio_districts: d, physio_subdistricts: s }))}
              hideSectionTitle
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase block pl-1">詳細地址 (診所)</label>
            <input type="text" value={form.physio_address} onChange={e => setForm({ ...form, physio_address: e.target.value })} placeholder="例如：彌敦道 123 號 4 樓" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 transition outline-none" />
          </div>
        </div>
        <label className="flex items-center gap-3.5 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-900 transition-colors">
          <input type="checkbox" checked={form.physio_is_address_public} onChange={e => setForm({ ...form, physio_is_address_public: e.target.checked })} className="w-4 h-4 rounded border-slate-700 text-green-500 bg-slate-950" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-200">對外公開診所詳細地址</span>
            <span className="text-[10px] md:text-xs text-slate-500">關閉後，名片上將只顯示「主要服務地區」，保護您的私人隱私。</span>
          </div>
        </label>
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-800/80">
        <button onClick={handleSave} disabled={saving} className="bg-green-700 hover:bg-green-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black px-8 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "儲存中..." : "儲存名片設定"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function PhysioDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uncontactedEnquiryCount, setUncontactedEnquiryCount] = useState(0);
  const [uncontactedServiceIds, setUncontactedServiceIds] = useState<Set<string>>(new Set());

  const refreshPhysioEnquiryDots = useCallback(async (physioId: string) => {
    const { data } = await supabase
      .from("physio_enquiries")
      .select("service_id, status")
      .eq("physio_id", physioId)
      .neq("status", "contacted");
    const rows = data ?? [];
    setUncontactedEnquiryCount(rows.length);
    setUncontactedServiceIds(new Set(rows.map((r) => r.service_id)));
  }, [supabase]);

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
      if (!prof?.is_physio) { router.push("/profile"); return; }
      setProfile(prof);
      setLoading(false);
      refreshPhysioEnquiryDots(prof.id);
    };
    init();
  }, [supabase, router, refreshPhysioEnquiryDots]);

  useEffect(() => {
    if (!profile?.id) return;
    const onSync = () => refreshPhysioEnquiryDots(profile.id);
    window.addEventListener("sync-physio-enquiries", onSync);
    const channel = supabase
      .channel(`physio-dashboard-enquiries-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "physio_enquiries", filter: `physio_id=eq.${profile.id}` },
        onSync
      )
      .subscribe();
    return () => {
      window.removeEventListener("sync-physio-enquiries", onSync);
      supabase.removeChannel(channel);
    };
  }, [profile?.id, supabase, refreshPhysioEnquiryDots]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono text-sm">載入治療師後台中...</div>;
  if (!profile) return null;

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push("/profile")} className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> 返回個人檔案
          </button>
          <Link href={`/p/${profile.id}?tab=physio`} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition">
            預覽公開名片 <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            {profile.avatar_url && <div className="w-14 h-14 rounded-2xl bg-cover bg-center border border-slate-700 shrink-0" style={{ backgroundImage: `url(${profile.avatar_url})` }} />}
            <div>
              <p className="text-[10px] text-green-400 font-black uppercase tracking-widest mb-0.5">物理治療師專屬後台</p>
              <h1 className="text-2xl md:text-3xl font-black text-white">{profile.full_name || profile.first_name}</h1>
              <p className="text-xs text-zinc-500 mt-0.5">@{profile.handle} · 治療師管理中心</p>
            </div>
          </div>
        </div>

        {/* ── Sub tabs ── */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 mb-8">
          {([
            { id: "settings", icon: <Settings      className="w-4 h-4 shrink-0" />, label: "治療師名片設定" },
            { id: "services", icon: <ClipboardList className="w-4 h-4 shrink-0" />, label: "診療項目管理" },
            { id: "inbox",    icon: <Inbox         className="w-4 h-4 shrink-0" />, label: "預約諮詢收件匣" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)} className={`relative py-3 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer ${subTab === t.id ? "bg-green-700 text-white shadow-md" : "text-zinc-400 hover:text-white hover:bg-slate-800/50"}`}>
              {t.icon}<span className="truncate">{t.label}</span>
              {t.id === "services" && uncontactedServiceIds.size > 0 && <span className={ENQUIRY_DOT_CLASS} />}
              {t.id === "inbox" && uncontactedEnquiryCount > 0 && <span className={ENQUIRY_DOT_CLASS} />}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {subTab === "settings" && <PhysioSettingsPanel profile={profile} onSaved={() => {}} />}
        {subTab === "services" && (
          <PhysioServicesManager
            physioId={profile.id}
            uncontactedServiceIds={uncontactedServiceIds}
            onEnquiriesChanged={() => refreshPhysioEnquiryDots(profile.id)}
          />
        )}
        {subTab === "inbox" && (
          <PhysioEnquiriesInbox
            physioId={profile.id}
            onEnquiriesChanged={() => refreshPhysioEnquiryDots(profile.id)}
          />
        )}
      </div>
    </div>
  );
}

function PhysioDashboardWithSuspense() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">載入中...</div>}>
      <PhysioDashboardContent />
    </Suspense>
  );
}

export default dynamic(() => Promise.resolve(PhysioDashboardWithSuspense), { ssr: false });
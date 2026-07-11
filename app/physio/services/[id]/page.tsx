"use client";

import { toast } from "sonner";
import { appConfirm } from "@/lib/app-dialog";
import { useState, useEffect, useMemo, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  MapPin, DollarSign, Star, MessageSquare, ArrowLeft,
  Loader2, CheckCircle2, User as UserIcon, Send, Image as ImageIcon, AlertCircle, Settings
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { profileLink } from "@/lib/profile-links";
import {
  formatDistrictList,
  formatSubdistrictList,
  normalizeDistrictIds,
  normalizeSubdistrictIds,
} from "@/lib/hk-locations";
import { RichBody } from "@/components/content/RichBody";
import { formatPhysioServicePrice } from "@/lib/coach-pricing";
import { PhysioServiceTypeBadges } from "@/components/physio/PhysioServiceTypePicker";
import { normalizePhysioServiceTypes } from "@/lib/physio-service-types";
import { ENQUIRY_MESSAGE_MAX, clampEnquiryMessage } from "@/lib/service-enquiry";
import { isPhysioServicePubliclyVisible } from "@/lib/role-listing";

export default function PhysioServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: serviceId } = use(params);
  const returnTo = `/physio/services/${serviceId}`;
  const router = useRouter();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [bottomTab, setBottomTab] = useState<"reviews" | "gallery">("reviews");

  const [isInquireOpen, setIsInquireOpen] = useState(false);
  const [inquireMsg, setInquireMsg] = useState("");
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [hasEnquired, setHasEnquired] = useState(false);
  const [myEnquiryId, setMyEnquiryId] = useState<string | null>(null);

  const [ratingVal, setRatingVal] = useState(5);
  const [commentVal, setCommentVal] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchServiceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: srv, error: srvErr } = await supabase
        .from("physio_services")
        .select(`*, physio:profiles!physio_id (id, full_name, avatar_url, physio_qualifications, is_physio, physio_status)`)
        .eq("id", serviceId)
        .single();

      if (srvErr) throw new Error(srvErr.message);

      if (!isPhysioServicePubliclyVisible(srv, srv.physio, user?.id, srv.physio_id)) {
        setService(null);
        return;
      }
      setService(srv);

      const { data: revs, error: revErr } = await supabase
        .from("physio_reviews")
        .select(`*, patient:profiles!patient_id (id, full_name, avatar_url)`)
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });

      if (revErr) console.error("讀取評價失敗:", revErr.message);
      setReviews(revs || []);

      const { count } = await supabase
        .from("physio_enquiries")
        .select("*", { count: "exact", head: true })
        .eq("service_id", serviceId);
      setEnquiryCount(count || 0);

      if (user) {
        const { data: myEnq } = await supabase
          .from("physio_enquiries")
          .select("id")
          .eq("service_id", serviceId)
          .eq("patient_id", user.id)
          .maybeSingle();
        if (myEnq) {
          setHasEnquired(true);
          setMyEnquiryId(myEnq.id);
        } else {
          setHasEnquired(false);
          setMyEnquiryId(null);
        }
      }
    } catch (err: any) {
      console.error("無法載入診療項目:", err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, serviceId]);

  useEffect(() => { fetchServiceData(); }, [fetchServiceData]);

  useEffect(() => {
    const channel = supabase
      .channel(`physio_reviews_service_${serviceId}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "physio_reviews",
          filter: `service_id=eq.${serviceId}`,
        },
        (payload) => {
          setReviews((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "physio_reviews",
          filter: `service_id=eq.${serviceId}`,
        },
        () => {
          fetchServiceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, serviceId, fetchServiceData]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return "0.0";
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return router.push("/auth");
    if (!inquireMsg.trim()) { toast.error("請填寫詢問內容！"); return; }
    const message = clampEnquiryMessage(inquireMsg.trim());
    if (!message) { toast.error("請填寫詢問內容！"); return; }

    setIsSubmittingInquiry(true);
    try {
      const { data: inserted, error } = await supabase.from("physio_enquiries").insert({
        service_id: serviceId,
        physio_id: service.physio_id,
        patient_id: currentUser.id,
        message,
      }).select("id").single();
      if (error) throw error;

      const { error: rpcError } = await supabase.rpc("notify_physio_enquiry", {
        p_service_id: serviceId,
      });
      if (rpcError) console.error("通知發送失敗:", rpcError.message);

      toast.success("🎉 預約諮詢已成功發送！");
      setHasEnquired(true);
      setMyEnquiryId(inserted?.id ?? null);
      setIsInquireOpen(false);
      setEnquiryCount((c) => c + 1);
    } catch (err: any) {
      toast.error("發送失敗: " + err.message);
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  const handleWithdrawInquiry = async () => {
    if (!currentUser || !myEnquiryId) return;
    if (!(await appConfirm("確定要撤回諮詢單嗎？治療師將收到通知。"))) return;

    setIsSubmittingInquiry(true);
    try {
      const { error } = await supabase.from("physio_enquiries").delete().eq("id", myEnquiryId);
      if (error) throw error;
      setHasEnquired(false);
      setMyEnquiryId(null);
      setEnquiryCount((c) => Math.max(0, c - 1));
      toast.success("已撤回諮詢單");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知錯誤";
      toast.error("撤回失敗: " + message);
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return router.push("/auth");
    if (!commentVal.trim()) { toast.error("請分享您的心得！"); return; }

    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.from("physio_reviews").insert({
        service_id: serviceId,
        physio_id: service.physio_id,
        patient_id: currentUser.id,
        rating: Number(ratingVal),
        comment: commentVal.trim(),
      });
      if (error) throw error;

      toast.success("🎉 評價已成功送出！");
      setCommentVal("");
      setRatingVal(5);
    } catch (err: any) {
      toast.error(`評價發布失敗: ${err.message || "未知錯誤"}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">
      <Loader2 className="w-6 h-6 animate-spin mr-2 text-green-500" /> 載入診療項目中...
    </div>
  );
  if (!service) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
      <h2 className="text-xl font-bold mb-4">找不到此診療項目</h2>
      <button onClick={() => router.back()} className="text-green-400 underline text-sm cursor-pointer">返回上一頁</button>
    </div>
  );

  const isMyOwnService = currentUser?.id === service.physio_id;
  const priceDisplay = formatPhysioServicePrice(service);

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white font-bold transition cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> 返回上一頁
          </button>
          {isMyOwnService && (
            <Link
              href={`/dashboard/physio?subtab=services&service=${serviceId}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-black transition shadow-[0_0_15px_rgba(34,197,94,0.25)] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              管理此項目 →
            </Link>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <PhysioServiceTypeBadges types={normalizePhysioServiceTypes(service.service_types, service.service_type)} size="sm" />
            <span className="text-xs font-bold text-green-400 bg-green-950/50 border border-green-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              🔥 已有 {enquiryCount} 人發送諮詢單
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-4">{service.title}</h1>

          <Link href={`/p/${service.physio_id}?tab=physio`} className="inline-flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition mb-6 group cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center shrink-0 flex items-center justify-center" style={service.physio?.avatar_url ? { backgroundImage: `url(${service.physio.avatar_url})` } : undefined}>
              {!service.physio?.avatar_url && <UserIcon className="w-5 h-5 text-zinc-500" />}
            </div>
            <div>
              <div className="text-xs text-zinc-400">治療師</div>
              <div className="text-sm font-bold text-white group-hover:text-green-400 transition">{service.physio?.full_name || "物理治療師"}</div>
            </div>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 mb-6 text-sm">
            <div className="flex items-center gap-3 sm:col-span-2">
              <MapPin className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                {service.service_centre && (
                  <>
                    <div className="text-xs text-zinc-500 font-bold">服務中心</div>
                    <div className="font-extrabold text-green-300 mb-1">{service.service_centre}</div>
                  </>
                )}
                <div className="text-xs text-zinc-500 font-bold">{service.full_address ? "完整地址" : "診療地區"}</div>
                <div className="font-extrabold text-white">
                  {service.full_address ||
                    formatDistrictList(
                      normalizeDistrictIds(service.districts, service.location),
                      4
                    ) ||
                    "可商議 / 到診所或到府"}
                </div>
                {!service.full_address && normalizeSubdistrictIds(service.subdistricts).length > 0 && (
                  <div className="text-xs text-zinc-400 mt-1 font-medium">
                    細分：{formatSubdistrictList(normalizeSubdistrictIds(service.subdistricts), 6)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-500 font-bold">項目收費</div>
                <div className={`font-extrabold text-base ${priceDisplay.isDm ? "text-zinc-300" : "text-green-400"}`}>
                  {priceDisplay.main}
                  {priceDisplay.unit && (
                    <span className="text-xs text-zinc-400 font-normal ml-1">{priceDisplay.unit}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-8">
            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider">診療內容說明</h3>
            <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/40">
              <RichBody html={service.description} emptyText="治療師尚未填寫詳細說明。" />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-green-400 fill-green-400" />
              <span className="text-lg font-black">{avgRating}</span>
              <span className="text-xs text-zinc-400">({reviews.length} 則評價)</span>
            </div>

            {!isMyOwnService && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsInquireOpen(true)}
                  type="button"
                  disabled={isSubmittingInquiry}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                    hasEnquired
                      ? "bg-slate-800 text-zinc-300 border border-slate-700"
                      : "bg-green-600 hover:bg-green-500 text-white"
                  }`}
                >
                  {hasEnquired ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <MessageSquare className="w-4 h-4" />}
                  {hasEnquired ? "再次發送諮詢" : "立即預約 / 發送諮詢單"}
                </button>
                {hasEnquired && myEnquiryId && (
                  <button
                    type="button"
                    onClick={handleWithdrawInquiry}
                    disabled={isSubmittingInquiry}
                    className="w-full sm:w-auto px-4 py-3.5 rounded-xl font-bold text-xs text-zinc-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition disabled:opacity-50"
                  >
                    撤回諮詢
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex border-b border-slate-800 gap-6 px-2">
          <button
            onClick={() => setBottomTab("reviews")}
            type="button"
            className={`pb-3 text-base font-black transition flex items-center gap-2 cursor-pointer border-b-2 ${
              bottomTab === "reviews" ? "border-green-500 text-white -mb-px" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> 評價與討論 ({reviews.length})
          </button>
          <button
            onClick={() => setBottomTab("gallery")}
            type="button"
            className={`pb-3 text-base font-black transition flex items-center gap-2 cursor-pointer border-b-2 ${
              bottomTab === "gallery" ? "border-green-500 text-white -mb-px" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ImageIcon className="w-4 h-4" /> 診所相簿 ({service.photos?.length || 0})
          </button>
        </div>

        {bottomTab === "reviews" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fadeIn">
            <h3 className="text-lg font-black flex items-center justify-between">
              <span>真實評價區 ({reviews.length})</span>
              <span className="text-xs text-green-400 font-bold">綜合評價 {avgRating} / 5.0 ⭐</span>
            </h3>

            {isMyOwnService ? (
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-zinc-400 text-xs font-bold">
                <AlertCircle className="w-5 h-5 text-green-400 shrink-0" />
                <span>您是本項目的治療師，系統已隱藏評價撰寫功能。</span>
              </div>
            ) : !currentUser ? (
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-bold">
                <span className="text-zinc-400">登入會員後即可撰寫評價分享心得！</span>
                <Link href="/auth" className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl transition">前往登入</Link>
              </div>
            ) : (
              <form onSubmit={handleAddReview} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">留下您的真實評價</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} type="button" onClick={() => setRatingVal(s)} className={`text-lg transition cursor-pointer ${ratingVal >= s ? "text-green-400" : "text-zinc-600"}`}>★</button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="分享治療體驗、專業度與恢復成效！"
                  value={commentVal}
                  onChange={(e) => setCommentVal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-green-500 transition resize-none"
                />
                <div className="flex justify-end">
                  <button type="submit" disabled={isSubmittingReview} className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-800 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5">
                    {isSubmittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isSubmittingReview ? "發送中..." : "發佈評價"}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4 divide-y divide-slate-800/80 pt-2">
              {reviews.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs font-bold">尚無評價，快來成為第一個推薦人！</div>
              ) : (
                reviews.map(rev => (
                  <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Link href={profileLink(rev.patient?.id || rev.patient_id, returnTo)} className="shrink-0">
                          <div
                            className="w-8 h-8 rounded-full bg-slate-800 bg-cover bg-center border border-slate-700"
                            style={rev.patient?.avatar_url ? { backgroundImage: `url(${rev.patient.avatar_url})` } : undefined}
                          />
                        </Link>
                        <div className="min-w-0">
                          <Link href={profileLink(rev.patient?.id || rev.patient_id, returnTo)} className="text-xs font-bold text-white hover:text-green-400 transition block truncate">
                            {rev.patient?.full_name || "運動員"}
                          </Link>
                          <div className="text-[10px] text-zinc-500">{new Date(rev.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <span className="text-xs text-green-400 font-bold bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                        {"★".repeat(rev.rating)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 pl-10 leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {bottomTab === "gallery" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl animate-fadeIn">
            {service.photos && service.photos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {service.photos.map((url: string, idx: number) => (
                  <div key={idx} className="relative h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                    <Image src={url} alt="Service showcase" fill className="object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-zinc-500 font-bold text-sm border border-dashed border-slate-800 rounded-2xl">
                治療師目前尚未上傳任何相片。
              </div>
            )}
          </div>
        )}
      </div>

      {isInquireOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-black text-white mb-1">預約諮詢：{service.title}</h3>
            <p className="text-xs text-zinc-400 mb-4">發送聯絡資訊給治療師，對方將於收件匣收到並主動與您聯繫。</p>
            <form onSubmit={handleSendInquiry} className="space-y-4">
              <textarea
                rows={4}
                required
                maxLength={ENQUIRY_MESSAGE_MAX}
                placeholder="例：治療師好！最近膝蓋不適，想預約運動傷患評估，請問本週有空檔嗎？"
                value={inquireMsg}
                onChange={(e) => setInquireMsg(clampEnquiryMessage(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-green-500"
              />
              <p className="text-[10px] text-zinc-500 text-right">{inquireMsg.length}/{ENQUIRY_MESSAGE_MAX}</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsInquireOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-zinc-300 font-bold text-xs cursor-pointer">取消</button>
                <button type="submit" disabled={isSubmittingInquiry} className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5">
                  {isSubmittingInquiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  確認送出諮詢
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

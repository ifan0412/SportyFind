"use client";

import { useState, useEffect, useMemo, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  MapPin, DollarSign, Star, MessageSquare, ArrowLeft, 
  Loader2, CheckCircle2, User as UserIcon, Send, Image as ImageIcon, AlertCircle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function CoachServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: serviceId } = use(params);
  const router = useRouter();

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

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

  const [ratingVal, setRatingVal] = useState(5);
  const [commentVal, setCommentVal] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchServiceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: srv, error: srvErr } = await supabase
        .from("coach_services")
        .select(`*, coach:profiles (id, full_name, avatar_url, bio)`)
        .eq("id", serviceId)
        .single();

      if (srvErr) throw new Error(srvErr.message);
      setService(srv);

      const { data: revs, error: revErr } = await supabase
        .from("coach_reviews")
        .select(`*, student:profiles!student_id (id, full_name, avatar_url)`)
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });
        
      if (revErr) console.error("讀取評價失敗:", revErr.message);
      setReviews(revs || []);

      const { count } = await supabase
        .from("coach_enquiries")
        .select("*", { count: "exact", head: true })
        .eq("service_id", serviceId);
      setEnquiryCount(count || 0);

      if (user) {
        const { data: myEnq } = await supabase
          .from("coach_enquiries")
          .select("id")
          .eq("service_id", serviceId)
          .eq("student_id", user.id)
          .maybeSingle();
        if (myEnq) setHasEnquired(true);
      }
    } catch (err: any) {
      console.error("無法載入課程服務原因:", err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, serviceId]);

  useEffect(() => { fetchServiceData(); }, [fetchServiceData]);

  // 🔥 Realtime subscription — so deleted reviews vanish instantly
  useEffect(() => {
    const channel = supabase
      .channel(`coach_reviews_service_${serviceId}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "coach_reviews",
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
          table: "coach_reviews",
          filter: `service_id=eq.${serviceId}`,
        },
        () => {
          // Re-fetch on new insert to get joined student profile data
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

  // 🔥 handleSendInquiry — now calls notify_coach_enquiry RPC after insert
  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return router.push("/auth");
    if (!inquireMsg.trim()) return alert("請填寫詢問內容！");

    setIsSubmittingInquiry(true);
    try {
      const { error } = await supabase.from("coach_enquiries").insert({
        service_id: serviceId, 
        coach_id: service.coach_id, 
        student_id: currentUser.id, 
        message: inquireMsg.trim(),
      });
      if (error) throw error;

      // 🔔 Trigger bell notification to coach
      const { error: rpcError } = await supabase.rpc("notify_coach_enquiry", {
        p_service_id: serviceId,
      });
      if (rpcError) console.error("通知發送失敗:", rpcError.message);

      alert("🎉 詢問單已成功發送！");
      setHasEnquired(true); 
      setIsInquireOpen(false); 
      setEnquiryCount(c => c + 1);
    } catch (err: any) { 
      alert("發送失敗: " + err.message); 
    } finally { 
      setIsSubmittingInquiry(false); 
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return router.push("/auth");
    if (!commentVal.trim()) return alert("請分享您的心得！");

    setIsSubmittingReview(true);
    try {
      const payload = {
        service_id: serviceId,
        coach_id: service.coach_id,
        student_id: currentUser.id,
        rating: Number(ratingVal),
        comment: commentVal.trim(),
      };

      const { error } = await supabase.from("coach_reviews").insert(payload);
      if (error) throw error;

      alert("🎉 評價已成功送出！");
      setCommentVal("");
      setRatingVal(5);
      // Realtime INSERT subscription will trigger fetchServiceData automatically
    } catch (err: any) {
      alert(`評價發布失敗！請檢查權限: ${err.message || "未知錯誤"}`);
      console.error("寫入評價詳細錯誤:", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">
      <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" /> 載入課程中...
    </div>
  );
  if (!service) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
      <h2 className="text-xl font-bold mb-4">找不到此課程或服務</h2>
      <button onClick={() => router.back()} className="text-blue-400 underline text-sm cursor-pointer">返回上一頁</button>
    </div>
  );

  const isMyOwnCourse = currentUser?.id === service.coach_id;

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white font-bold transition cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> 返回上一頁
        </button>

        {/* 課程詳細資訊主卡 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              {service.sport_category} 專業訓練
            </span>
            <span className="text-xs font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              🔥 已有 {enquiryCount} 人發送諮詢單
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-4">{service.title}</h1>

          <Link href={`/p/${service.coach_id}?tab=coach`} className="inline-flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition mb-6 group cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center shrink-0 flex items-center justify-center" style={service.coach?.avatar_url ? { backgroundImage: `url(${service.coach.avatar_url})` } : undefined}>
              {!service.coach?.avatar_url && <UserIcon className="w-5 h-5 text-zinc-500" />}
            </div>
            <div>
              <div className="text-xs text-zinc-400">授課教練</div>
              <div className="text-sm font-bold text-white group-hover:text-amber-400 transition">{service.coach?.full_name || "專業教練"}</div>
            </div>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 mb-6 text-sm">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-500 font-bold">授課場地 / 地區</div>
                <div className="font-extrabold text-white">{service.location || "可商議 / 到府或球場"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-500 font-bold">課程報價 (HKD)</div>
                <div className="font-extrabold text-emerald-400 text-base">${service.hourly_rate} <span className="text-xs text-zinc-400 font-normal">/ 每小時</span></div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-8">
            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider">課程與教學內容說明</h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-slate-950/30 p-4 rounded-2xl border border-slate-800/40">
              {service.description || "教練尚未填寫詳細課程說明。"}
            </p>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-lg font-black">{avgRating}</span>
              <span className="text-xs text-zinc-400">({reviews.length} 則評價)</span>
            </div>

            {!isMyOwnCourse && (
              <button
                onClick={() => setIsInquireOpen(true)}
                type="button"
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                  hasEnquired
                    ? "bg-slate-800 text-zinc-300 border border-slate-700"
                    : "bg-amber-600 hover:bg-amber-500 text-white"
                }`}
              >
                {hasEnquired ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <MessageSquare className="w-4 h-4" />}
                {hasEnquired ? "再次發送詢問" : "立即預約 / 發送諮詢單"}
              </button>
            )}
          </div>
        </div>

        {/* 雙分頁標籤切換列 */}
        <div className="flex border-b border-slate-800 gap-6 px-2">
          <button
            onClick={() => setBottomTab("reviews")}
            type="button"
            className={`pb-3 text-base font-black transition flex items-center gap-2 cursor-pointer border-b-2 ${
              bottomTab === "reviews" ? "border-amber-500 text-white -mb-px" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> 學員評價與討論 ({reviews.length})
          </button>
          <button
            onClick={() => setBottomTab("gallery")}
            type="button"
            className={`pb-3 text-base font-black transition flex items-center gap-2 cursor-pointer border-b-2 ${
              bottomTab === "gallery" ? "border-amber-500 text-white -mb-px" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ImageIcon className="w-4 h-4" /> 課程實況相簿 ({service.photos?.length || 0})
          </button>
        </div>

        {/* 頁籤內容一：評價區 */}
        {bottomTab === "reviews" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fadeIn">
            <h3 className="text-lg font-black flex items-center justify-between">
              <span>學員真實評價區 ({reviews.length})</span>
              <span className="text-xs text-amber-400 font-bold">綜合評價 {avgRating} / 5.0 ⭐</span>
            </h3>

            {isMyOwnCourse ? (
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-zinc-400 text-xs font-bold">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>您是本課程的授課教練，系統已隱藏評價撰寫功能（無法對自己的課程撰寫評價）。</span>
              </div>
            ) : !currentUser ? (
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-bold">
                <span className="text-zinc-400">登入會員後即可對課程撰寫上課評價分享心得！</span>
                <Link href="/auth" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition">前往登入</Link>
              </div>
            ) : (
              <form onSubmit={handleAddReview} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">留下您的真實上課評價</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} type="button" onClick={() => setRatingVal(s)} className={`text-lg transition cursor-pointer ${ratingVal >= s ? "text-amber-400" : "text-zinc-600"}`}>★</button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="分享上課心得、教練的指導專業度給其他運動員吧！"
                  value={commentVal}
                  onChange={(e) => setCommentVal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition resize-none"
                />
                <div className="flex justify-end">
                  <button type="submit" disabled={isSubmittingReview} className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5">
                    {isSubmittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isSubmittingReview ? "發送評價中..." : "發佈評價"}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4 divide-y divide-slate-800/80 pt-2">
              {reviews.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs font-bold">本課程尚無評價，快來成為第一個推薦人！</div>
              ) : (
                reviews.map(rev => (
                  <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full bg-slate-800 bg-cover bg-center border border-slate-700"
                          style={rev.student?.avatar_url ? { backgroundImage: `url(${rev.student.avatar_url})` } : undefined}
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{rev.student?.full_name || "運動學員"}</div>
                          <div className="text-[10px] text-zinc-500">{new Date(rev.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
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

        {/* 頁籤內容二：相簿區 */}
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
                教練目前尚未為此課程上傳任何實況相片。
              </div>
            )}
          </div>
        )}
      </div>

      {/* 詢問單 Modal */}
      {isInquireOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-black text-white mb-1">預約諮詢：{service.title}</h3>
            <p className="text-xs text-zinc-400 mb-4">發送聯絡資訊給教練，教練將於專屬收件匣收到並主動與您聯繫。</p>
            <form onSubmit={handleSendInquiry} className="space-y-4">
              <textarea
                rows={4}
                required
                placeholder="例：教練好！目前想加強接發球技術，請問週末有空檔嗎？"
                value={inquireMsg}
                onChange={(e) => setInquireMsg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsInquireOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-zinc-300 font-bold text-xs cursor-pointer">取消</button>
                <button type="submit" disabled={isSubmittingInquiry} className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5">
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
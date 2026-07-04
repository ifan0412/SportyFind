"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  MapPin, DollarSign, Star, MessageSquare, ArrowLeft, 
  Loader2, Shield, Send, CheckCircle2, User as UserIcon, Calendar
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function CoachServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 詢問單 Modal
  const [isInquireOpen, setIsInquireOpen] = useState(false);
  const [inquireMsg, setInquireMsg] = useState("");
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [hasEnquired, setHasEnquired] = useState(false);

  // 評價表單
  const [ratingVal, setRatingVal] = useState(5);
  const [commentVal, setCommentVal] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchServiceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 1. 撈取服務詳情 + 教練檔案
      const { data: srv, error: srvErr } = await supabase
        .from("coach_services")
        .select(`
          *,
          coach:profiles!coach_id (id, full_name, avatar_url, bio)
        `)
        .eq("id", serviceId)
        .single();

      if (srvErr) throw srvErr;
      setService(srv);

      // 2. 撈取專屬評價與評論人檔案
      const { data: revs } = await supabase
        .from("coach_reviews")
        .select(`*, student:profiles!student_id (id, full_name, avatar_url)`)
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });
      setReviews(revs || []);

      // 3. 計算獨特詢問人數 (Number of unique enquiries)
      const { count } = await supabase
        .from("coach_enquiries")
        .select("*", { count: "exact", head: true })
        .eq("service_id", serviceId);
      setEnquiryCount(count || 0);

      // 檢查當前用戶是否已經發過詢問
      if (user) {
        const { data: myEnq } = await supabase
          .from("coach_enquiries")
          .select("id")
          .eq("service_id", serviceId)
          .eq("student_id", user.id)
          .maybeSingle();
        if (myEnq) setHasEnquired(true);
      }
    } catch (err) {
      console.error("無法載入課程服務:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, serviceId]);

  useEffect(() => {
    fetchServiceData();
  }, [fetchServiceData]);

  // 平均星等計算
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // 送出詢問單 (建立 Lead)
  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return router.push("/auth");
    if (!inquireMsg.trim()) return alert("請簡單說明您的學習目標或方便上課的時間！");

    setIsSubmittingInquiry(true);
    try {
      const { error } = await supabase.from("coach_enquiries").insert({
        service_id: serviceId,
        coach_id: service.coach_id,
        student_id: currentUser.id,
        message: inquireMsg.trim(),
      });

      if (error) throw error;
      alert("🎉 詢問單已發送！教練收到後會儘速與您聯絡。");
      setHasEnquired(true);
      setIsInquireOpen(false);
      setEnquiryCount(c => c + 1);
    } catch (err: any) {
      alert("發送失敗: " + err.message);
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  // 送出評價
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return router.push("/auth");
    if (!commentVal.trim()) return alert("請分享您的上課心得！");

    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.from("coach_reviews").insert({
        service_id: serviceId,
        coach_id: service.coach_id,
        student_id: currentUser.id,
        rating: ratingVal,
        comment: commentVal.trim(),
      });

      if (error) throw error;
      setCommentVal("");
      await fetchServiceData();
    } catch (err: any) {
      alert("評價失敗: " + err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500 font-mono">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" /> 載入課程資訊...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-xl font-bold mb-4">找不到此課程或服務</h2>
        <button onClick={() => router.back()} className="text-blue-400 underline text-sm">返回上一頁</button>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* 導覽列 */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> 返回教練檔案
        </button>

        {/* 頂部課程海報 / 照片櫥窗 */}
        {service.photos && service.photos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-3xl overflow-hidden max-h-96">
            {service.photos.slice(0, 2).map((url: string, idx: number) => (
              <div key={idx} className="relative h-64 md:h-96 bg-slate-900">
                <Image src={url} alt="Service showcase" fill className="object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-48 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 border border-slate-800 flex items-center justify-center text-zinc-500 font-bold">
            教練尚無上傳課程實況照片
          </div>
        )}

        {/* 課程詳細核心資訊卡 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-600/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
              {service.sport_category} 專業訓練
            </span>

            {/* 獨特詢問次數追蹤標章 */}
            <span className="text-xs font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              🔥 已有 {enquiryCount} 人發起詢問單
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-4">{service.title}</h1>

          {/* 教練簡介小卡連結 */}
          <Link
            href={`/network/${service.coach_id}?tab=coach`}
            className="inline-flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition mb-6 group cursor-pointer"
          >
            <div
              className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center shrink-0 flex items-center justify-center"
              style={service.coach?.avatar_url ? { backgroundImage: `url(${service.coach.avatar_url})` } : undefined}
            >
              {!service.coach?.avatar_url && <UserIcon className="w-5 h-5 text-zinc-500" />}
            </div>
            <div>
              <div className="text-xs text-zinc-400">授課教練</div>
              <div className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                {service.coach?.full_name || "專業教練"}
              </div>
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
                <div className="font-extrabold text-emerald-400 text-base">
                  ${service.hourly_rate} <span className="text-xs text-zinc-400 font-normal">/ 每小時</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-8">
            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider">課程與教學內容說明</h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-slate-950/30 p-4 rounded-2xl border border-slate-800/40">
              {service.description || "教練尚未填寫詳細課程說明。"}
            </p>
          </div>

          {/* 報價與預約行動呼籲 CTA */}
          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-lg font-black">{avgRating}</span>
              <span className="text-xs text-zinc-400">({reviews.length} 則學員評價)</span>
            </div>

            {currentUser?.id !== service.coach_id && (
              <button
                type="button"
                onClick={() => setIsInquireOpen(true)}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                  hasEnquired 
                    ? "bg-slate-800 text-zinc-300 border border-slate-700" 
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {hasEnquired ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <MessageSquare className="w-4 h-4" />}
                {hasEnquired ? "再次發送課程詢問" : "立即預約 / 發送詢問單"}
              </button>
            )}
          </div>
        </div>

        {/* 課程評價留言區 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <h3 className="text-lg font-black flex items-center justify-between">
            <span>學員真實評價區 ({reviews.length})</span>
            <span className="text-xs text-amber-400 font-bold">綜合評價 {avgRating} / 5.0 ⭐</span>
          </h3>

          {/* 新增評價表單 (限非教練本人) */}
          {currentUser && currentUser.id !== service.coach_id && (
            <form onSubmit={handleAddReview} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">寫下您的上課評價</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRatingVal(s)}
                      className={`text-base transition cursor-pointer ${ratingVal >= s ? "text-amber-400" : "text-zinc-600"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="教練教學是否細心？場地如何？分享給其他運動員吧！"
                value={commentVal}
                onChange={(e) => setCommentVal(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                >
                  {isSubmittingReview ? "送出中..." : "發佈評價"}
                </button>
              </div>
            </form>
          )}

          {/* 評價清單 */}
          <div className="space-y-4 divide-y divide-slate-800/80">
            {reviews.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs font-bold">本課程尚無評價，快來成為第一個推薦人！</div>
            ) : (
              reviews.map(rev => (
                <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full bg-slate-800 bg-cover bg-center"
                        style={rev.student?.avatar_url ? { backgroundImage: `url(${rev.student.avatar_url})` } : undefined}
                      />
                      <span className="text-xs font-bold text-white">{rev.student?.full_name || "運動學員"}</span>
                    </div>
                    <span className="text-xs text-amber-400 font-bold">{"★".repeat(rev.rating)}</span>
                  </div>
                  <p className="text-xs text-zinc-300 pl-9">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 發送詢問 Modal */}
      {isInquireOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">預約詢問：{service.title}</h3>
            <p className="text-xs text-zinc-400 mb-4">發送您的聯絡資訊與學習需求給教練，教練將在專屬收件匣收到並主動聯繫您。</p>

            <form onSubmit={handleSendInquiry} className="space-y-4">
              <textarea
                rows={4}
                required
                placeholder="例：教練好！我平常週六下午在維園方便上課，目前想加強殺球與接發球，請問有空檔嗎？"
                value={inquireMsg}
                onChange={(e) => setInquireMsg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInquireOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-zinc-300 font-bold text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInquiry}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingInquiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  確認送出詢問
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
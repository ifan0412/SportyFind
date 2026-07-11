"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/components/SupabaseProvider";
import { FormSelect } from "@/components/ui/form-select";
import { LISTING_PAGE_SHELL_PADDING } from "@/lib/listing-sections";
import { SITE } from "@/lib/site";

type FeedbackCategory = "feedback" | "inquiry" | "report";

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "feedback", label: "意見回饋" },
  { value: "inquiry", label: "查詢" },
  { value: "report", label: "舉報" },
];

export function FeedbackForm() {
  const { user, isLoading } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>("feedback");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = message.trim().length >= 10 && !isSubmitting && !submitted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "提交失敗");
      }

      const data = await res.json().catch(() => ({}));
      setSubmitted(true);
      setMessage("");
      if (data.emailSent) {
        toast.success("已送出，我們會盡快回覆。");
      } else {
        toast.success("已記錄您的意見，我們會於後台查閱。");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <div className={`max-w-xl mx-auto px-4 sm:px-6 ${LISTING_PAGE_SHELL_PADDING}`}>
        <BackButton label="返回首頁" href="/" />

        <header className="mt-4 mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
            {SITE.name}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <MessageSquareText className="w-7 h-7 text-blue-400" />
            意見回饋 / 查詢 / 舉報
          </h1>
          <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
            如有功能建議、使用問題或需要舉報內容，請填寫以下表格。我們會以電郵方式跟進。
          </p>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 mb-6 flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">支援電郵</p>
            <a
              href={`mailto:${SITE.supportEmail}`}
              className="text-sm font-bold text-blue-400 hover:underline break-all"
            >
              {SITE.supportEmail}
            </a>
          </div>
        </div>

        {!isLoading && !user && (
          <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6">
            請先{" "}
            <Link href="/auth" className="font-bold underline hover:text-amber-300">
              登入
            </Link>{" "}
            後提交。
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback-category" className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
              類型
            </label>
            <FormSelect
              id="feedback-category"
              value={category}
              onValueChange={(value) => setCategory(value as FeedbackCategory)}
              options={CATEGORIES}
              disabled={isSubmitting || submitted || !user}
            />
          </div>

          <div>
            <label htmlFor="feedback-message" className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
              訊息
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="請描述您的意見、查詢或舉報內容…"
              rows={6}
              maxLength={5000}
              disabled={isSubmitting || submitted || !user}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-500 outline-none resize-y min-h-[140px] disabled:opacity-50"
            />
            <p className="text-[10px] text-zinc-600 mt-1.5 text-right">{message.length} / 5000</p>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || !user}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-zinc-600 text-white text-sm font-black transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中…
              </>
            ) : submitted ? (
              "已提交"
            ) : (
              <>
                <Send className="w-4 h-4" />
                提交
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

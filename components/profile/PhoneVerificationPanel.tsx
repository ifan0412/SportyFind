"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Phone, ShieldCheck } from "lucide-react";
import { formatPhoneDisplay, normalizeHkPhone } from "@/lib/verification";

const RESEND_COOLDOWN_SECONDS = 30;
const MAX_SENDS_PER_USER = 3;

interface PhoneVerificationPanelProps {
  initialPhone?: string | null;
  initialVerifiedAt?: string | null;
  initialPendingAdminReview?: boolean;
  onVerified?: () => void;
  onPendingReviewChange?: (pending: boolean) => void;
}

export function PhoneVerificationPanel({
  initialPhone,
  initialVerifiedAt,
  initialPendingAdminReview = false,
  onVerified,
  onPendingReviewChange,
}: PhoneVerificationPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [phoneInput, setPhoneInput] = useState(
    initialPhone?.replace(/^\+852/, "") ?? ""
  );
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(initialVerifiedAt);
  const [verifiedPhone, setVerifiedPhone] = useState(initialPhone);
  const [pendingAdminReview, setPendingAdminReview] = useState(initialPendingAdminReview);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const isVerified = Boolean(verifiedAt);

  useEffect(() => {
    setPendingAdminReview(initialPendingAdminReview);
  }, [initialPendingAdminReview]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSendOtp = async () => {
    if (pendingAdminReview) {
      toast.error("驗證碼請求次數過多，請等候管理員審核。");
      return;
    }

    const e164 = normalizeHkPhone(phoneInput);
    if (!e164) {
      toast.error("請輸入有效的香港手機號碼（8 位數字）。");
      return;
    }

    if (cooldownSeconds > 0) {
      toast.error(`請等待 ${cooldownSeconds} 秒後再重發。`);
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
      });

      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
        status?: string;
        cooldown_seconds?: number;
        attempts_remaining?: number;
      };

      if (!res.ok) {
        if (data.status === "awaiting_admin_review") {
          setPendingAdminReview(true);
          onPendingReviewChange?.(true);
        }
        if (data.cooldown_seconds) setCooldownSeconds(data.cooldown_seconds);
        if (typeof data.attempts_remaining === "number") {
          setAttemptsRemaining(data.attempts_remaining);
        }
        throw new Error(data.error || "發送驗證碼失敗");
      }

      setOtpSent(true);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      if (typeof data.attempts_remaining === "number") {
        setAttemptsRemaining(data.attempts_remaining);
      }
      toast.success("驗證碼已發送。請查收 SMS。");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發送驗證碼失敗");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const e164 = normalizeHkPhone(phoneInput);
    if (!e164 || !otp.trim()) {
      toast.error("請輸入驗證碼。");
      return;
    }

    setIsVerifying(true);
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        phone: e164,
        token: otp.trim(),
        type: "phone_change",
      });
      if (otpError) throw otpError;

      const { data: rpcData, error: rpcError } = await supabase.rpc("mark_phone_verified", {
        p_phone_e164: e164,
      });
      if (rpcError) throw rpcError;

      const result = rpcData as { success?: boolean; message?: string };
      if (!result?.success) {
        throw new Error(result?.message || "無法更新電話驗證狀態");
      }

      setVerifiedAt(new Date().toISOString());
      setVerifiedPhone(e164);
      setOtp("");
      setOtpSent(false);
      toast.success("手機號碼已驗證！");
      onVerified?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "驗證失敗");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendDisabled = isSending || cooldownSeconds > 0 || pendingAdminReview;
  const resendLabel =
    cooldownSeconds > 0 ? `重發 (${cooldownSeconds}s)` : "重發";

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Phone className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-black text-white">手機號碼驗證</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            選填。驗證後檔案會顯示「已驗證手機」標記，有助提高好友接受率、球隊申請及服務洽詢的成功率。每位用戶最多發送 {MAX_SENDS_PER_USER} 次驗證碼，重發需間隔 {RESEND_COOLDOWN_SECONDS} 秒。
          </p>
        </div>
      </div>

      {isVerified ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-300">已驗證</p>
            <p className="text-xs text-zinc-400">{formatPhoneDisplay(verifiedPhone) || verifiedPhone}</p>
          </div>
        </div>
      ) : pendingAdminReview ? (
        <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-200">請求次數過多，等候管理員審核</p>
            <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
              您已達 SMS 驗證碼發送上限。驗證功能已暫停，管理員審核通過後將重新開放。如有需要請聯絡 SportyFind 支援。
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <span className="inline-flex items-center px-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-zinc-400 font-bold">
              +852
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="9123 4567"
              disabled={isSending}
              className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="輸入 6 位驗證碼"
              disabled={!otpSent}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-emerald-500 outline-none tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-[10px] text-zinc-500 pl-1">
              {otpSent
                ? "驗證碼已發送至您的手機，請輸入後按「確認驗證」。"
                : "按「發送驗證碼」後，系統會透過 SMS 發送 6 位數驗證碼。"}
            </p>
          </div>

          {attemptsRemaining !== null && attemptsRemaining >= 0 && (
            <p className="text-[10px] text-zinc-500 pl-1">
              剩餘發送次數：{attemptsRemaining} / {MAX_SENDS_PER_USER}
            </p>
          )}

          <div className="flex gap-2">
            {!otpSent ? (
              <button
                type="button"
                onClick={() => void handleSendOtp()}
                disabled={isSending || phoneInput.length < 8}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                發送驗證碼
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleSendOtp()}
                  disabled={resendDisabled}
                  className="px-4 py-2.5 bg-slate-800 text-zinc-400 text-xs font-bold rounded-xl hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLabel}
                </button>
                <button
                  type="button"
                  onClick={() => void handleVerifyOtp()}
                  disabled={isVerifying || otp.length < 6}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2"
                >
                  {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  確認驗證
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

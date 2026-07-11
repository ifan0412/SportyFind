"use client";

import Link from "next/link";
import { Mail, X } from "lucide-react";
import { useAuth } from "@/components/SupabaseProvider";
import { isEmailVerified, isOAuthUser } from "@/lib/verification";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [dismissed, setDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);

  if (!user || dismissed || isOAuthUser(user) || isEmailVerified(user)) {
    return null;
  }

  const handleResend = async () => {
    if (!user.email) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) throw error;
      toast.success("驗證電郵已重新發送。");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發送失敗");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black text-amber-200">請驗證您的電郵地址</p>
          <p className="text-xs text-amber-200/70 mt-0.5">
            我們已發送驗證連結至 <span className="font-bold">{user.email}</span>。完成驗證後可使用完整功能。
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={isResending}
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 text-xs font-bold hover:bg-amber-500/30 transition disabled:opacity-50"
        >
          {isResending ? "發送中…" : "重發電郵"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-amber-300/60 hover:text-amber-200 hover:bg-amber-500/10 transition"
          aria-label="關閉"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function EmailVerificationGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading || !user || isOAuthUser(user) || isEmailVerified(user)) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
        <Mail className="w-7 h-7 text-amber-400" />
      </div>
      <h2 className="text-xl font-black text-white">請先驗證電郵</h2>
      <p className="text-sm text-zinc-400 leading-relaxed">
        請查收寄至 <span className="text-white font-bold">{user.email}</span> 的驗證連結，完成後即可使用 SportyFind。
      </p>
      <Link
        href="/auth"
        className="inline-block text-sm text-blue-400 hover:underline font-bold"
      >
        返回登入頁重發驗證電郵
      </Link>
    </div>
  );
}

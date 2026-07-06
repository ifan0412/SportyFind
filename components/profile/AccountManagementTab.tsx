"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { getPasswordValidationError, isPasswordValid } from "@/lib/password";
import { toast } from "sonner";
import { AlertTriangle, ChevronRight, KeyRound, Loader2, Shield, Trash2, X } from "lucide-react";

interface AccountManagementTabProps {
  userEmail: string | undefined;
  identities?: { provider: string }[];
}

export function AccountManagementTab({ userEmail, identities }: AccountManagementTabProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const hasEmailPassword = identities?.some((i) => i.provider === "email") ?? false;
  const oauthProvider = identities?.find((i) => i.provider !== "email")?.provider;

  const [showResetForm, setShowResetForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const resetCanSubmit =
    currentPassword.length > 0 &&
    isPasswordValid(newPassword) &&
    currentPassword !== newPassword &&
    !isResetting;

  const deleteCanSubmit = hasEmailPassword
    ? deletePassword.length > 0 && !isDeleting
    : deleteConfirmText === "DELETE" && !isDeleting;

  const closeResetForm = () => {
    setShowResetForm(false);
    setCurrentPassword("");
    setNewPassword("");
  };

  const closeDeleteWarning = () => {
    setShowDeleteWarning(false);
    setDeletePassword("");
    setDeleteConfirmText("");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) {
      toast.error("找不到帳戶電郵。");
      return;
    }
    if (!currentPassword) {
      toast.error("請輸入目前密碼。");
      return;
    }
    const validationError = getPasswordValidationError(newPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("新密碼不能與目前密碼相同。");
      return;
    }

    setIsResetting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (signInError) {
        toast.error("目前密碼不正確。");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      toast.success("密碼已成功更新。");
      closeResetForm();
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) {
      toast.error("找不到帳戶電郵。");
      return;
    }

    setIsDeleting(true);
    try {
      if (hasEmailPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: deletePassword,
        });
        if (signInError) {
          toast.error("密碼不正確，無法刪除帳戶。");
          return;
        }
      } else if (deleteConfirmText !== "DELETE") {
        toast.error('請輸入 "DELETE" 以確認刪除。');
        return;
      }

      const { error: deleteError } = await supabase.rpc("delete_own_account");
      if (deleteError) {
        toast.error(deleteError.message || "刪除帳戶失敗，請稍後再試。");
        return;
      }

      await supabase.auth.signOut();
      toast.success("帳戶已永久刪除。");
      router.push("/auth");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          帳戶管理
        </h2>
        <p className="text-xs text-zinc-500 mt-1">管理登入安全與帳戶設定。</p>
      </div>

      {/* Account info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">帳戶資訊</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-xs text-zinc-500">登入電郵</p>
            <p className="text-sm font-bold text-white">{userEmail || "—"}</p>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-800 text-zinc-400 border border-slate-700 w-fit">
            {hasEmailPassword ? "電郵 + 密碼" : oauthProvider ? `${oauthProvider} 登入` : "第三方登入"}
          </span>
        </div>
      </div>

      {/* Reset password */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => {
            if (hasEmailPassword) {
              setShowResetForm((v) => !v);
              if (showResetForm) closeResetForm();
            }
          }}
          disabled={!hasEmailPassword}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">重設密碼</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {hasEmailPassword ? "更新您的登入密碼" : "Google 登入帳戶無法重設密碼"}
              </p>
            </div>
          </div>
          {hasEmailPassword && (
            <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${showResetForm ? "rotate-90" : ""}`} />
          )}
        </button>

        {showResetForm && hasEmailPassword && (
          <form onSubmit={handleResetPassword} className="px-5 pb-5 pt-0 space-y-3 border-t border-slate-800/80">
            <div className="pt-4 space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">目前密碼</label>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isResetting}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition disabled:opacity-50"
                placeholder="輸入目前密碼"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase pl-1">新密碼</label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isResetting}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition disabled:opacity-50"
                placeholder="輸入新密碼"
              />
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">密碼要求</p>
              <PasswordRequirements password={newPassword} />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeResetForm}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-zinc-400 font-bold text-xs hover:bg-slate-700 transition"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!resetCanSubmit}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2"
              >
                {isResetting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 更新中...</> : "更新密碼"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Delete account */}
      <div className="bg-red-950/20 border border-red-500/30 rounded-2xl overflow-hidden">
        {!showDeleteWarning ? (
          <button
            type="button"
            onClick={() => setShowDeleteWarning(true)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-red-950/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-black text-red-400">刪除帳戶</p>
                <p className="text-xs text-zinc-500 mt-0.5">永久刪除帳戶及所有相關資料</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400/60" />
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-red-400">確定要刪除帳戶嗎？</p>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    此動作<strong className="text-red-300">無法復原</strong>。您的個人檔案、課程、評價、好友關係及所有上傳內容將被永久移除。
                  </p>
                </div>
              </div>
              <button type="button" onClick={closeDeleteWarning} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-slate-800 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {hasEmailPassword ? (
              <div className="space-y-1">
                <label className="text-[10px] text-red-400/80 font-bold uppercase pl-1">輸入密碼以確認刪除</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  disabled={isDeleting}
                  className="w-full bg-slate-950/50 border border-red-500/30 rounded-xl p-3 text-white text-sm focus:border-red-500 outline-none transition disabled:opacity-50"
                  placeholder="輸入您的登入密碼"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] text-red-400/80 font-bold uppercase pl-1">輸入 DELETE 以確認刪除</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isDeleting}
                  className="w-full bg-slate-950/50 border border-red-500/30 rounded-xl p-3 text-white text-sm font-mono focus:border-red-500 outline-none transition disabled:opacity-50"
                  placeholder="DELETE"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeDeleteWarning}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-zinc-400 font-bold text-xs hover:bg-slate-700 transition"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!deleteCanSubmit}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2"
              >
                {isDeleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 刪除中...</> : "永久刪除帳戶"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

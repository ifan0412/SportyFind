"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { appConfirm, appPrompt } from "@/lib/app-dialog";
import { profileDisplayName } from "@/lib/profile-display-name";
import { Loader2, Search, User, Ban, UserCheck, Trash2, Phone } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  created_at: string;
  is_coach: boolean;
  is_physio: boolean;
  is_player: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  phone_sms_pending_admin_review: boolean;
  phone_sms_review_requested_at: string | null;
  phone_verified_at: string | null;
}

export default function AdminUsersPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "sms_review">("all");
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [isCleaningSeed, setIsCleaningSeed] = useState(false);

  const handleCleanupSeedProfiles = async () => {
    const ok = await appConfirm({
      title: "清除種子假帳號",
      message: "永久刪除開發時植入的假運動員檔案（李慧詩 Sarah、張宇 Marco 等）？此動作無法復原。",
      confirmLabel: "永久刪除",
      destructive: true,
    });
    if (!ok) return;

    setIsCleaningSeed(true);
    const { data, error: rpcError } = await supabase.rpc("admin_cleanup_seed_profiles");
    setIsCleaningSeed(false);

    if (rpcError) {
      toast.error(
        rpcError.message.includes("admin_cleanup_seed_profiles")
          ? "請先在 Supabase SQL Editor 執行 supabase/migrations/045_cleanup_seed_profiles.sql"
          : rpcError.message
      );
      return;
    }
    const result = data as { success?: boolean; deleted_auth_users?: number; deleted_orphan_profiles?: number };
    if (!result?.success) {
      toast.error("清除失敗");
      return;
    }
    toast.success(
      `已清除種子假帳號（auth: ${result.deleted_auth_users ?? 0}、孤立檔案: ${result.deleted_orphan_profiles ?? 0}）`
    );
    fetchUsers();
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("admin_list_users");
    if (rpcError) {
      setError(rpcError.message);
      setUsers([]);
    } else {
      setUsers((data as AdminUser[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const smsReviewCount = useMemo(
    () => users.filter((u) => u.phone_sms_pending_admin_review).length,
    [users]
  );

  const filtered = useMemo(() => {
    let list = users;
    if (filter === "active") list = list.filter((u) => !u.is_suspended);
    if (filter === "suspended") list = list.filter((u) => u.is_suspended);
    if (filter === "sms_review") list = list.filter((u) => u.phone_sms_pending_admin_review);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.handle || "").toLowerCase().includes(q) ||
        `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(q)
    );
  }, [users, search, filter]);

  const displayName = (u: AdminUser) => profileDisplayName(u);

  const handleSuspend = async (u: AdminUser) => {
    const reason = await appPrompt({
      title: "暫停用戶",
      message: `請輸入暫停「${displayName(u)}」的原因（選填，將顯示給用戶）：`,
      placeholder: "違反社群守則…",
      confirmLabel: "確認暫停",
    });
    if (reason === null) return;

    const confirmed = await appConfirm({
      title: "確認暫停",
      message: `確定要暫停 ${displayName(u)}（${u.email}）嗎？對方將無法登入。`,
      destructive: true,
      confirmLabel: "暫停帳戶",
    });
    if (!confirmed) return;

    setActingId(u.id);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_suspend_user", {
        p_user_id: u.id,
        p_reason: reason.trim() || null,
      });
      if (rpcError) throw rpcError;
      const result = data as { success?: boolean; message?: string };
      if (!result?.success) {
        toast.error(result?.message || "暫停失敗");
        return;
      }
      toast.success(result.message || "已暫停用戶");
      await fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "暫停失敗");
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    const ok = await appConfirm({
      title: "永久刪除用戶",
      message: `確定要永久刪除「${displayName(u)}」(${u.email})？此動作無法復原，將一併刪除檔案、訊息與相關資料。`,
      confirmLabel: "永久刪除",
      destructive: true,
    });
    if (!ok) return;

    setActingId(u.id);
    const { data, error: rpcError } = await supabase.rpc("admin_delete_user", {
      p_user_id: u.id,
    });
    setActingId(null);

    if (rpcError) {
      toast.error(rpcError.message.includes("admin_delete_user") ? "請先在 Supabase 執行 migration 044_admin_delete_user.sql" : rpcError.message);
      return;
    }
    const result = data as { success?: boolean; message?: string };
    if (!result?.success) {
      toast.error(result?.message || "刪除失敗");
      return;
    }
    toast.success(result.message || "已刪除用戶");
    fetchUsers();
  };

  const handleUnlockPhoneSms = async (u: AdminUser) => {
    const confirmed = await appConfirm({
      title: "解除 SMS 驗證限制",
      message: `確定要為「${displayName(u)}」重新開放 SMS 驗證嗎？將重置發送次數（最多 3 次）。`,
      confirmLabel: "解除限制",
    });
    if (!confirmed) return;

    setActingId(u.id);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_unlock_phone_sms", {
        p_user_id: u.id,
      });
      if (rpcError) throw rpcError;
      const result = data as { success?: boolean; message?: string };
      if (!result?.success) {
        toast.error(result?.message || "解除失敗");
        return;
      }
      toast.success(result.message || "已解除 SMS 限制");
      await fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "解除失敗");
    } finally {
      setActingId(null);
    }
  };

  const handleReactivate = async (u: AdminUser) => {
    const confirmed = await appConfirm({
      title: "恢復帳戶",
      message: `確定要恢復 ${displayName(u)}（${u.email}）的帳戶嗎？將發送站內通知及恢復電郵。`,
      confirmLabel: "恢復帳戶",
    });
    if (!confirmed) return;

    setActingId(u.id);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_reactivate_user", {
        p_user_id: u.id,
      });
      if (rpcError) throw rpcError;
      const result = data as { success?: boolean; message?: string; email?: string };
      if (!result?.success) {
        toast.error(result?.message || "恢復失敗");
        return;
      }

      if (result.email) {
        const emailRes = await fetch("/api/admin/send-reactivation-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: result.email, name: displayName(u) }),
        });
        const emailJson = await emailRes.json().catch(() => ({}));
        if (emailJson.sent) {
          toast.success("已恢復帳戶並發送通知電郵");
        } else {
          toast.success("已恢復帳戶（站內通知已發送；電郵需設定 RESEND_API_KEY）");
        }
      } else {
        toast.success(result.message || "已恢復帳戶");
      }

      await fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "恢復失敗");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AdminShell title="用戶管理" wide>
      <p className="text-sm text-zinc-500 mb-6 -mt-2">
        管理已註冊用戶。可暫停違規帳戶（登入將被攔截），或恢復帳戶並發送通知。
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          type="button"
          disabled={isCleaningSeed}
          onClick={handleCleanupSeedProfiles}
          className="shrink-0 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold hover:bg-red-500/20 disabled:opacity-50 transition"
        >
          {isCleaningSeed ? "清除中…" : "🧹 清除種子假帳號"}
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="search"
            placeholder="搜尋電郵、名稱或 handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "suspended", "sms_review"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                filter === key
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-slate-900 border-slate-800 text-zinc-400 hover:text-white"
              }`}
            >
              {key === "all"
                ? "全部"
                : key === "active"
                  ? "正常"
                  : key === "suspended"
                    ? "已暫停"
                    : `SMS 待審${smsReviewCount > 0 ? ` (${smsReviewCount})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error.includes("not authorized") ? "無權限存取" : error}
          {error.includes("function") && (
            <p className="text-xs mt-2 text-red-300/80">請在 Supabase 執行 migration 041_admin_user_moderation.sql</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-500 font-bold mb-4">共 {filtered.length} 位用戶</p>
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border ${
                  u.is_suspended
                    ? "bg-red-500/5 border-red-500/20"
                    : u.phone_sms_pending_admin_review
                      ? "bg-amber-500/5 border-amber-500/25"
                      : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center bg-cover bg-center"
                    style={{ backgroundImage: u.avatar_url ? `url(${u.avatar_url})` : undefined }}
                  >
                    {!u.avatar_url && <User className="w-5 h-5 text-zinc-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{displayName(u)}</p>
                    <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                    {u.handle && <p className="text-[11px] text-zinc-600">@{u.handle}</p>}
                    {u.is_suspended && u.suspended_reason && (
                      <p className="text-[11px] text-red-400/80 mt-1">原因：{u.suspended_reason}</p>
                    )}
                    {u.phone_sms_pending_admin_review && (
                      <p className="text-[11px] text-amber-400/90 mt-1">
                        SMS 驗證待審
                        {u.phone_sms_review_requested_at
                          ? ` · ${new Date(u.phone_sms_review_requested_at).toLocaleString("zh-HK")}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {u.phone_sms_pending_admin_review && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      SMS 待審
                    </span>
                  )}
                  {u.phone_verified_at && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      手機已驗證
                    </span>
                  )}
                  {u.is_coach && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      教練
                    </span>
                  )}
                  {u.is_physio && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      物理治療
                    </span>
                  )}
                  {u.is_player && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      運動員
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-600 font-bold">
                    {new Date(u.created_at).toLocaleDateString("zh-HK")}
                  </span>
                  {u.is_suspended && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                      已暫停
                    </span>
                  )}
                  <Link
                    href={`/p/${u.id}`}
                    target="_blank"
                    className="text-xs font-bold text-blue-400 hover:text-blue-300"
                  >
                    查看檔案
                  </Link>
                  {u.phone_sms_pending_admin_review && (
                    <button
                      type="button"
                      disabled={actingId === u.id}
                      onClick={() => handleUnlockPhoneSms(u)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-50"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {actingId === u.id ? "處理中…" : "解除 SMS 限制"}
                    </button>
                  )}
                  {u.is_suspended ? (
                    <button
                      type="button"
                      disabled={actingId === u.id}
                      onClick={() => handleReactivate(u)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {actingId === u.id ? "處理中…" : "恢復"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actingId === u.id}
                      onClick={() => handleSuspend(u)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {actingId === u.id ? "處理中…" : "暫停"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={actingId === u.id}
                    onClick={() => handleDelete(u)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {actingId === u.id ? "處理中…" : "刪除"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}

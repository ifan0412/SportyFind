"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Loader2, Search, User } from "lucide-react";

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
}

export default function AdminUsersPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.handle || "").toLowerCase().includes(q) ||
        `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(q)
    );
  }, [users, search]);

  const displayName = (u: AdminUser) =>
    u.full_name?.trim() ||
    `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
    u.handle ||
    "未命名用戶";

  return (
    <AdminShell title="用戶管理" wide>
      <p className="text-sm text-zinc-500 mb-6 -mt-2">
        已註冊用戶列表。暫停／刪除帳戶與登入攔截功能將於後續版本加入。
      </p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="search"
          placeholder="搜尋電郵、名稱或 handle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error.includes("not authorized") ? "無權限存取" : error}
          {error.includes("function") && (
            <p className="text-xs mt-2 text-red-300/80">請在 Supabase 執行 migration 006_admin_analytics.sql</p>
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
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800"
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
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                  <Link
                    href={`/p/${u.id}`}
                    target="_blank"
                    className="text-xs font-bold text-blue-400 hover:text-blue-300"
                  >
                    查看檔案
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}

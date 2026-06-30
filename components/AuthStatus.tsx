"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AuthStatus() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (loading) return <div className="w-8 h-8" />;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/profile" className="flex flex-col items-center justify-center text-slate-400 hover:text-white transition py-1 px-2">
          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-blue-400 ring-1 ring-blue-500/30">
            ME
          </div>
          <span className="text-[10px] font-medium tracking-wide mt-0.5 hidden md:block text-slate-300">個人檔案</span>
        </Link>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition px-2"
        >
          登出
        </button>
      </div>
    );
  }

  return (
    <Link href="/auth" className="flex flex-col items-center justify-center text-slate-400 hover:text-white transition py-1 px-2">
      <span className="text-base">👤</span>
      <span className="text-[10px] font-medium tracking-wide mt-0.5 hidden md:block">登入</span>
    </Link>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSiteAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus("denied");
        router.replace("/auth");
        return;
      }
      if (!isSiteAdmin(user.email)) {
        setStatus("denied");
        router.replace("/");
        return;
      }
      setStatus("allowed");
    };
    check();
  }, [supabase, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (status === "denied") return null;

  return <>{children}</>;
}

export function AdminShell({
  title,
  children,
  action,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="bg-slate-950 min-h-screen text-zinc-200">
      <div className={`${wide ? "max-w-6xl" : "max-w-5xl"} mx-auto px-4 sm:px-6 py-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <Link href="/" className="text-xs text-zinc-500 hover:text-white font-bold">← SportyFind</Link>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-2">{title}</h1>
            <p className="text-xs text-amber-400/80 font-bold mt-1">網站管理員後台</p>
          </div>
          {action}
        </div>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useAuth } from "@/components/SupabaseProvider";
import { LogOut, UserCircle, Loader2 } from "lucide-react";

export default function AuthStatus() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <Loader2 className="size-4 animate-spin text-slate-500" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 ml-2">
        <Link
          href="/profile"
          className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-white transition-colors px-2 py-1"
        >
          <UserCircle className="size-4" />
          ME
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="size-4" />
          登出
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth" // Ensure this matches your login page route
      className="flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 transition shadow-md shadow-blue-900/20"
    >
      登入
    </Link>
  );
}
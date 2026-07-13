"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { suspendedAccountMessage } from "@/lib/account-suspension";
import { isNetworkFetchError } from "@/lib/supabase/safe-query";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 💡 關鍵修正：改用 useState 來鎖死 Supabase 實例，確保它絕對不會在背景被 React 丟棄
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suspensionHandledRef = useRef<string | null>(null);

  const enforceSuspension = async (sessionUser: User | null) => {
    if (!sessionUser) {
      suspensionHandledRef.current = null;
      return;
    }
    if (suspensionHandledRef.current === sessionUser.id) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_suspended, suspended_reason")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (profile?.is_suspended) {
      suspensionHandledRef.current = sessionUser.id;
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      toast.error(suspendedAccountMessage(profile.suspended_reason), { duration: 10000 });
      router.replace("/auth");
      router.refresh();
    }
  };

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 150);
    };

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          const message = error.message.toLowerCase();
          if (
            message.includes("fetch") ||
            message.includes("network") ||
            message.includes("403") ||
            message.includes("forbidden")
          ) {
            toast.error("無法連線至伺服器。若在公司網路，請試用手機熱點或聯絡 IT 解除封鎖。", {
              duration: 12000,
            });
          }
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await enforceSuspension(session.user);
        }
      } catch (error) {
        setSession(null);
        setUser(null);
        if (isNetworkFetchError(error)) {
          toast.error("無法連線至伺服器。若在公司網路，請試用手機熱點或聯絡 IT 解除封鎖。", {
            duration: 12000,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);

      if (newSession?.user) {
        void enforceSuspension(newSession.user);
      } else {
        suspensionHandledRef.current = null;
      }

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        scheduleRefresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    router.push("/");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a SupabaseProvider");
  }
  return context;
};
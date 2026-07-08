"use client";

import { createContext, useContext, useEffect, useState } from "react"; // 💡 移除 useMemo
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; 
import { useRouter } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";

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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch {
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh(); 
      }
    });

    return () => {
      subscription.unsubscribe();
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
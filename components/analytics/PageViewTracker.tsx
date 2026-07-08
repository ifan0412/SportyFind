"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/SupabaseProvider";

const SESSION_KEY = "sf_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function PageViewTracker() {
  const pathname = usePathname();
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const lastTracked = useRef("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/gate")) return;
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const track = async () => {
      try {
        await supabase.from("site_page_views").insert({
          path: pathname,
          session_id: getSessionId(),
          user_id: user?.id ?? null,
          referrer: typeof document !== "undefined" ? document.referrer?.slice(0, 500) || null : null,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
        });
      } catch {
        // analytics must not break the page
      }
    };

    track();
  }, [pathname, supabase, user?.id]);

  return null;
}

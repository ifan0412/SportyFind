"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { AnnouncementEditor } from "@/components/admin/AnnouncementEditor";
import type { SitePopupAnnouncement } from "@/lib/announcements/types";
import { Loader2 } from "lucide-react";

export default function EditAnnouncementPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [announcement, setAnnouncement] = useState<SitePopupAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("site_popup_announcements")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (fetchError || !data) {
        setError(fetchError?.message || "找不到此 pop-up");
        setAnnouncement(null);
      } else {
        setAnnouncement(data as SitePopupAnnouncement);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  if (loading) {
    return (
      <AdminShell title="編輯 Pop-up">
        <div className="py-20 flex justify-center text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </AdminShell>
    );
  }

  if (error || !announcement) {
    return (
      <AdminShell title="編輯 Pop-up">
        <div className="py-16 text-center text-red-400 text-sm">{error || "找不到此 pop-up"}</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={`編輯：${announcement.title}`}>
      <AnnouncementEditor announcement={announcement} />
    </AdminShell>
  );
}

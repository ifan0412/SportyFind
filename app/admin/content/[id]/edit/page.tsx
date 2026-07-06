"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { ContentEditor } from "@/components/admin/ContentEditor";
import type { ContentPost } from "@/lib/types/content";
import { Loader2 } from "lucide-react";

export default function AdminContentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdminContentEdit id={id} />;
}

function AdminContentEdit({ id }: { id: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [post, setPost] = useState<ContentPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("content_posts").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        router.replace("/admin/content");
        return;
      }
      setPost(data as ContentPost);
      setLoading(false);
    };
    load();
  }, [supabase, id, router]);

  if (loading || !post) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <AdminShell title="編輯文章">
      <ContentEditor post={post} />
    </AdminShell>
  );
}

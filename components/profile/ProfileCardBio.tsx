"use client";

import { useMemo, useState } from "react";
import { Pencil, Loader2, Check, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PROFILE_CARD_BIO_MAX } from "@/lib/content/body";
import { cn } from "@/lib/utils";

interface ProfileCardBioProps {
  userId: string;
  bio: string | null | undefined;
  onSaved: (bio: string) => void;
  className?: string;
}

export function ProfileCardBio({ userId, bio, onSaved, className }: ProfileCardBioProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio || "");
  const [saving, setSaving] = useState(false);

  const displayBio = (bio || "").trim();

  const startEdit = () => {
    setDraft(displayBio);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(displayBio);
    setEditing(false);
  };

  const saveBio = async () => {
    const cleaned = draft.replace(/<[^>]+>/g, "").trim().slice(0, PROFILE_CARD_BIO_MAX);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ bio: cleaned || null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      alert("儲存失敗，請稍後再試。");
      return;
    }
    onSaved(cleaned);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={cn("text-left bg-slate-900/30 p-4 rounded-2xl border border-blue-500/30", className)}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={PROFILE_CARD_BIO_MAX}
          rows={3}
          autoFocus
          placeholder="寫下一段關於你的歷程..."
          className="w-full bg-slate-950/60 border border-slate-700 rounded-xl p-3 text-base md:text-sm text-zinc-200 leading-relaxed resize-none focus:outline-none focus:border-blue-500"
        />
        <div className="flex items-center justify-between mt-2 gap-2">
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {draft.length}/{PROFILE_CARD_BIO_MAX}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
              aria-label="取消"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={saveBio}
              disabled={saving}
              className="p-1.5 rounded-lg text-blue-400 hover:text-white hover:bg-blue-600 transition disabled:opacity-50"
              aria-label="儲存"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative group text-sm text-zinc-300 leading-relaxed text-center bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50", className)}>
      <p>{displayBio || "寫下一段關於你的歷程..."}</p>
      <button
        type="button"
        onClick={startEdit}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-slate-800/80 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
        aria-label="編輯名片自介"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

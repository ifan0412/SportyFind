"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/SupabaseProvider";
import type { SharePayload } from "@/lib/share-payload";
import { ShareToFriendsModal } from "@/components/share/ShareToFriendsModal";

interface ShareMenuProps {
  payload: SharePayload;
  /** Short label on desktop; icon-only on very small screens if omitted uses 分享 */
  label?: string;
  className?: string;
}

export function ShareMenu({ payload, label = "分享", className = "" }: ShareMenuProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(payload.url);
      setCopied(true);
      toast.success("連結已複製");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("複製失敗");
    }
    setOpen(false);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.subtitle,
          url: payload.url,
        });
        setOpen(false);
        return;
      } catch {
        // user cancelled or failed — fall through to copy
      }
    }
    await copyLink();
  };

  const shareToFriends = () => {
    if (!user) {
      router.push("/auth");
      setOpen(false);
      return;
    }
    setOpen(false);
    setFriendsOpen(true);
  };

  return (
    <>
      <div ref={rootRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-black text-zinc-200 hover:text-white transition shadow-sm active:scale-95 cursor-pointer shrink-0"
          aria-label={label}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 hidden sm:inline">已複製</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{label}</span>
            </>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 overflow-hidden">
            <button
              type="button"
              onClick={copyLink}
              className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-slate-800 flex items-center gap-2.5 transition"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              複製連結
            </button>
            <button
              type="button"
              onClick={nativeShare}
              className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-slate-800 flex items-center gap-2.5 transition"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              其他方式分享
            </button>
            <button
              type="button"
              onClick={shareToFriends}
              className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-slate-800 flex items-center gap-2.5 transition"
            >
              <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              分享給 SportyFind 好友
            </button>
          </div>
        )}
      </div>

      <ShareToFriendsModal
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        payload={payload}
      />
    </>
  );
}

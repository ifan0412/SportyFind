"use client";

interface FeedTabProps {
  profile: { full_name: string | null; handle: string | null; first_name: string | null } | null;
  avatarSrc: string;
}

export function FeedTab({ profile, avatarSrc }: FeedTabProps) {
  return (
    <div className="animate-fadeIn space-y-6 max-w-3xl">
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 bg-cover bg-center" style={{ backgroundImage: avatarSrc ? `url(${avatarSrc})` : "none" }} />
          <div>
            <h4 className="text-sm font-black text-white">{profile?.full_name}</h4>
            <span className="text-[10px] text-zinc-500 uppercase">剛剛</span>
          </div>
        </div>
        <p className="text-sm text-zinc-300 font-medium">持續訓練，準備迎接下一個賽季！目前的技術儲備已經到位，期待能在友誼賽中驗證成果。🔥</p>
      </div>
    </div>
  );
}
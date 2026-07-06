export function ServicePublishBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center rounded-full text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        已發佈
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-slate-800 text-zinc-500 border border-slate-700">
      草稿
    </span>
  );
}

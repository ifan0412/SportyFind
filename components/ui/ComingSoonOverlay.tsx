"use client";

interface ComingSoonOverlayProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function ComingSoonOverlay({
  children,
  title = "即將推出",
  description = "個人動態功能正在開發中，敬請期待。",
}: ComingSoonOverlayProps) {
  return (
    <div className="relative min-h-[200px]">
      <div className="blur-md pointer-events-none select-none opacity-50 saturate-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-950/50 backdrop-blur-[3px]">
        <div className="text-center px-6 py-8 max-w-sm">
          <span className="inline-block px-4 py-2 rounded-full bg-blue-600/25 border border-blue-500/50 text-blue-200 text-sm font-black tracking-wide">
            {title}
          </span>
          <p className="text-xs text-zinc-400 mt-3 leading-relaxed font-medium">{description}</p>
        </div>
      </div>
    </div>
  );
}

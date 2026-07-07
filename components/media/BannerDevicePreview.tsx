"use client";

import {
  getBannerViewports,
  viewportAspect,
  type BannerPreviewLayout,
} from "@/lib/banner-display";

interface BannerDevicePreviewProps {
  previewUrl: string | null;
  layout: BannerPreviewLayout;
}

export function BannerDevicePreview({ previewUrl, layout }: BannerDevicePreviewProps) {
  const viewports = getBannerViewports(layout);
  const mobileAspect = viewportAspect(viewports.mobile);
  const desktopAspect = viewportAspect(viewports.desktop);

  return (
    <div className="w-full max-w-lg space-y-3">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
        顯示效果預覽
      </p>
      <div className="grid grid-cols-1 gap-3">
        <PreviewFrame
          label={`📱 ${viewports.mobile.label}`}
          aspect={mobileAspect}
          previewUrl={previewUrl}
          gradient="from-slate-950/70"
        />
        <PreviewFrame
          label={`🖥️ ${viewports.desktop.label} (16:9)`}
          aspect={desktopAspect}
          previewUrl={previewUrl}
          gradient="from-slate-950/60"
          maxHeight={layout === "team" ? 240 : 220}
        />
      </div>
      <p className="text-[10px] text-zinc-600 leading-relaxed px-1">
        {layout === "team"
          ? "桌面以 16:9 橫幅顯示（最高 480px）；手機為較矮橫幅。請確認重點在兩種預覽中都清楚可見。"
          : "文章封面會依裝置調整高度；請確認標題區域在兩種預覽中都不會被裁掉重要內容。"}
      </p>
    </div>
  );
}

function PreviewFrame({
  label,
  aspect,
  previewUrl,
  gradient,
  maxHeight,
}: {
  label: string;
  aspect: number;
  previewUrl: string | null;
  gradient: string;
  maxHeight?: number;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-zinc-500 mb-1.5">{label}</p>
      <div
        className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-900"
        style={{
          aspectRatio: aspect,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-slate-800 animate-pulse" />
        )}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${gradient} via-transparent to-transparent`}
        />
      </div>
    </div>
  );
}

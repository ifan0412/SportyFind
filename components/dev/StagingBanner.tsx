import { getAppEnv, stagingBannerLabel } from "@/lib/app-env";

export function StagingBanner() {
  if (getAppEnv() !== "staging") return null;

  return (
    <div
      className="sticky top-0 z-[200] bg-amber-500 text-amber-950 text-center text-xs sm:text-sm font-black py-1.5 px-3 border-b border-amber-600 shadow-md"
      role="status"
    >
      ⚠️ {stagingBannerLabel()}
    </div>
  );
}

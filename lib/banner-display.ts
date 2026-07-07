/** Viewport shapes that match real page CSS (object-cover). */
export const TEAM_BANNER_VIEWPORTS = {
  mobile: { width: 390, height: 176, label: "手機" },
  /** 16:9 desktop hero — matches md+ team page banner */
  desktop: { width: 1280, height: 720, label: "桌面" },
} as const;

export const TEAM_BANNER_DESKTOP_MAX_HEIGHT_PX = 480;

export const HERO_COVER_VIEWPORTS = {
  mobile: { width: 390, height: 320, label: "手機" },
  desktop: { width: 1440, height: 420, label: "桌面" },
} as const;

export type BannerPreviewLayout = "team" | "hero";

export function getBannerViewports(layout: BannerPreviewLayout) {
  return layout === "team" ? TEAM_BANNER_VIEWPORTS : HERO_COVER_VIEWPORTS;
}

export function viewportAspect(viewport: { width: number; height: number }) {
  return viewport.width / viewport.height;
}

import type { Viewport } from "next";
import { headers } from "next/headers";

export const MOBILE_UA_RE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export async function isMobileUserAgent(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return MOBILE_UA_RE.test(ua);
}

export async function mobileViewport(initialScale: number): Promise<Viewport> {
  const isMobile = await isMobileUserAgent();
  return {
    themeColor: "#020617",
    width: "device-width",
    initialScale: isMobile ? initialScale : 1,
    maximumScale: 1,
    userScalable: false,
  };
}

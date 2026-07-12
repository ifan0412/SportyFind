export const MOBILE_LOADING_SHOW_DELAY_MS = 400;
export const MOBILE_LOADING_NETWORK_TIMEOUT_MS = 18000;
export const MOBILE_LOADING_NETWORK_MESSAGE = "請檢查您的網路連線";

const AUTH_PREFIXES = ["/auth", "/gate"];

export function isAuthPath(pathname: string): boolean {
  return AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isInternalNavigationHref(href: string | null | undefined): href is string {
  if (!href) return false;
  if (href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("http://") || href.startsWith("https://")) return false;
  return href.startsWith("/");
}

export function normalizeInternalPath(href: string): string {
  try {
    const url = new URL(href, "https://sportyfind.local");
    return url.pathname + url.search + url.hash;
  } catch {
    return href;
  }
}

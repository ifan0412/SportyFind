/** Matches Navbar / mobile header `h-14` (56px). */
export const APP_CHROME_HEIGHT = 56;

export const APP_CHROME_SYNC_EVENT = "app-chrome-sync";

/** Live bottom edge of the mobile header (or desktop offset). */
export function measureAppChromeBottom(): number {
  if (typeof window === "undefined") return APP_CHROME_HEIGHT;

  if (window.matchMedia("(min-width: 768px)").matches) {
    return APP_CHROME_HEIGHT;
  }

  const header = document.querySelector<HTMLElement>("[data-mobile-header]");
  if (!header) return APP_CHROME_HEIGHT;

  return Math.max(0, header.getBoundingClientRect().bottom);
}

export function requestAppChromeSync() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(APP_CHROME_SYNC_EVENT));
}

/** Run `fn` on each chrome sync tick (scroll + header reveal animation). */
export function onAppChromeSync(fn: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => fn();
  window.addEventListener(APP_CHROME_SYNC_EVENT, handler);
  return () => window.removeEventListener(APP_CHROME_SYNC_EVENT, handler);
}

export function runChromeRevealSync(durationMs = 220) {
  if (typeof window === "undefined") return;

  const start = performance.now();
  const tick = (now: number) => {
    requestAppChromeSync();
    if (now - start < durationMs) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

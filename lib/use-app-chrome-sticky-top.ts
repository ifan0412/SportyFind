"use client";

import { useEffect, type RefObject } from "react";
import {
  measureAppChromeBottom,
  onAppChromeSync,
  requestAppChromeSync,
} from "@/lib/app-chrome-offset";

const MOBILE_MAX_WIDTH = 767;

/**
 * Keeps a sticky element's `top` aligned with the live mobile header bottom edge
 * (including scroll-hide / reveal). Clears inline `top` on desktop so Tailwind applies.
 */
export function useAppChromeStickyTop(
  ref: RefObject<HTMLElement | null>,
  enabled = true
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);

    const sync = () => {
      if (!mq.matches) {
        el.style.removeProperty("top");
        return;
      }
      el.style.top = `${measureAppChromeBottom()}px`;
    };

    const offChromeSync = onAppChromeSync(sync);
    const onScroll = () => sync();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    mq.addEventListener("change", sync);

    sync();
    requestAppChromeSync();

    return () => {
      offChromeSync();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
      mq.removeEventListener("change", sync);
      el.style.removeProperty("top");
    };
  }, [ref, enabled]);
}

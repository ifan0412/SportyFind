"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  APP_CHROME_HEIGHT,
  measureAppChromeBottom,
  onAppChromeSync,
  requestAppChromeSync,
  runChromeRevealSync,
} from "@/lib/app-chrome-offset";

const MOBILE_MAX_WIDTH = 767;

/**
 * Mobile header: hides progressively on scroll-down, slides back on scroll-up.
 * No-op on desktop (md+).
 */
export function useScrollHideHeader(headerRef: RefObject<HTMLElement | null>) {
  const hideOffsetRef = useRef(0);
  const lastScrollY = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);

    const headerHeight = () => header.offsetHeight;

    const applyHideOffset = (offset: number) => {
      hideOffsetRef.current = offset;
      header.style.transform =
        offset > 0 ? `translate3d(0,${-offset}px,0)` : "translate3d(0,0,0)";
      header.style.pointerEvents =
        offset >= headerHeight() - 2 ? "none" : "";
      requestAppChromeSync();
    };

    const revealAtOnce = () => {
      if (hideOffsetRef.current <= 0) return;
      header.dataset.revealing = "true";
      applyHideOffset(0);
      runChromeRevealSync();
      const onEnd = (event: TransitionEvent) => {
        if (event.target !== header || event.propertyName !== "transform") return;
        header.dataset.revealing = "false";
        header.removeEventListener("transitionend", onEnd);
        requestAppChromeSync();
      };
      header.addEventListener("transitionend", onEnd);
    };

    const reset = () => {
      header.dataset.revealing = "false";
      applyHideOffset(0);
    };

    const update = () => {
      if (!mq.matches) {
        reset();
        return;
      }

      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      if (y <= 0) {
        reset();
        lastScrollY.current = y;
        return;
      }

      if (delta > 0) {
        header.dataset.revealing = "false";
        const maxHide = headerHeight();
        applyHideOffset(Math.min(hideOffsetRef.current + delta, maxHide));
      } else if (delta < 0) {
        revealAtOnce();
      }

      lastScrollY.current = y;
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };

    const onResize = () => {
      if (!mq.matches) reset();
      else requestAppChromeSync();
    };

    header.dataset.revealing = "false";
    header.style.transform = "translate3d(0,0,0)";
    lastScrollY.current = window.scrollY;
    requestAppChromeSync();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    mq.addEventListener("change", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onResize);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      reset();
    };
  }, [headerRef]);
}

// Re-export for listing filter pin offset on desktop.
export { APP_CHROME_HEIGHT as LISTING_FILTER_TOP_OFFSET };

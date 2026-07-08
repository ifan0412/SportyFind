"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  APP_CHROME_HEIGHT,
  measureAppChromeBottom,
  onAppChromeSync,
  requestAppChromeSync,
} from "@/lib/app-chrome-offset";

/** @deprecated Use APP_CHROME_HEIGHT from app-chrome-offset */
export const LISTING_FILTER_TOP_OFFSET = APP_CHROME_HEIGHT;

/**
 * Drives scroll-reveal filter chrome imperatively (no React state on scroll).
 * Pin threshold is document-based; pinned `top` tracks the live mobile header.
 */
export function useScrollRevealFilter(
  anchorRef: RefObject<HTMLElement | null>,
  barRef: RefObject<HTMLElement | null>,
  spacerRef: RefObject<HTMLElement | null>
) {
  const pinnedRef = useRef(false);
  const hideOffsetRef = useRef(0);
  const lastScrollY = useRef(0);
  const pinThresholdRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const anchor = anchorRef.current;
    const bar = barRef.current;
    const spacer = spacerRef.current;
    if (!anchor || !bar || !spacer) return;

    const barHeight = () => bar.offsetHeight;

    const measurePinThreshold = () => {
      const rect = anchor.getBoundingClientRect();
      pinThresholdRef.current = window.scrollY + rect.top - APP_CHROME_HEIGHT;
    };

    const syncSpacerHeight = () => {
      if (!pinnedRef.current) {
        spacer.style.height = "0px";
        return;
      }
      spacer.style.height = `${bar.offsetHeight}px`;
    };

    const syncPinnedTop = () => {
      if (!pinnedRef.current) {
        bar.style.top = "";
        return;
      }
      bar.style.top = `${measureAppChromeBottom()}px`;
    };

    const applyHideOffset = (offset: number) => {
      hideOffsetRef.current = offset;
      bar.style.transform =
        offset > 0 ? `translate3d(0,${-offset}px,0)` : "translate3d(0,0,0)";
      bar.style.pointerEvents =
        offset >= barHeight() - 2 ? "none" : "";
    };

    const revealAtOnce = () => {
      if (hideOffsetRef.current <= 0) return;

      bar.dataset.revealing = "true";
      applyHideOffset(0);

      const onEnd = (event: TransitionEvent) => {
        if (event.target !== bar || event.propertyName !== "transform") return;
        bar.dataset.revealing = "false";
        bar.removeEventListener("transitionend", onEnd);
      };
      bar.addEventListener("transitionend", onEnd);
    };

    const resetHide = () => {
      bar.dataset.revealing = "false";
      applyHideOffset(0);
    };

    const applyPinned = (pinned: boolean) => {
      if (pinned === pinnedRef.current) return;
      pinnedRef.current = pinned;
      bar.dataset.pinned = pinned ? "true" : "false";

      if (pinned) {
        syncSpacerHeight();
        syncPinnedTop();
      } else {
        spacer.style.height = "0px";
        bar.style.top = "";
        resetHide();
      }
    };

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      // Stable document threshold — do not use live header bottom for pin/unpin.
      const shouldPin = y > Math.max(pinThresholdRef.current, 0);
      applyPinned(shouldPin);

      if (pinnedRef.current) {
        syncPinnedTop();

        if (delta > 0) {
          bar.dataset.revealing = "false";
          const maxHide = barHeight();
          const next = Math.min(hideOffsetRef.current + delta, maxHide);
          applyHideOffset(next);
        } else if (delta < 0) {
          revealAtOnce();
        }
      } else {
        resetHide();
      }

      lastScrollY.current = y;
    };

    bar.dataset.pinned = "false";
    bar.dataset.revealing = "false";
    bar.style.transform = "translate3d(0,0,0)";

    measurePinThreshold();

    const resizeObserver = new ResizeObserver(() => {
      measurePinThreshold();
      if (pinnedRef.current && hideOffsetRef.current > 0) {
        applyHideOffset(Math.min(hideOffsetRef.current, barHeight()));
      }
      syncSpacerHeight();
      syncPinnedTop();
    });
    resizeObserver.observe(bar);
    resizeObserver.observe(anchor);

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };

    const onResize = () => {
      measurePinThreshold();
      update();
    };

    const offChromeSync = onAppChromeSync(() => {
      if (pinnedRef.current) syncPinnedTop();
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    lastScrollY.current = window.scrollY;
    update();
    requestAppChromeSync();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      offChromeSync();
      resizeObserver.disconnect();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [anchorRef, barRef, spacerRef]);
}

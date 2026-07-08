"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Matches Navbar `h-14` (56px). */
export const LISTING_FILTER_TOP_OFFSET = 56;

/**
 * Drives scroll-reveal filter chrome imperatively (no React state on scroll).
 * Hide progress tracks scroll-down 1:1; scroll-up snaps the bar fully back in.
 */
export function useScrollRevealFilter(
  anchorRef: RefObject<HTMLElement | null>,
  barRef: RefObject<HTMLElement | null>,
  spacerRef: RefObject<HTMLElement | null>
) {
  const pinnedRef = useRef(false);
  const hideOffsetRef = useRef(0);
  const lastScrollY = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const anchor = anchorRef.current;
    const bar = barRef.current;
    const spacer = spacerRef.current;
    if (!anchor || !bar || !spacer) return;

    const barHeight = () => bar.offsetHeight;

    const syncSpacerHeight = () => {
      if (!pinnedRef.current) {
        spacer.style.height = "0px";
        return;
      }
      spacer.style.height = `${bar.offsetHeight}px`;
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
      } else {
        spacer.style.height = "0px";
        resetHide();
      }
    };

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      const rect = anchor.getBoundingClientRect();
      const shouldPin = y > 0 && rect.top < LISTING_FILTER_TOP_OFFSET;
      applyPinned(shouldPin);

      if (pinnedRef.current && y >= LISTING_FILTER_TOP_OFFSET) {
        if (delta > 0) {
          // Follow scroll-down 1:1 — no CSS transition.
          bar.dataset.revealing = "false";
          const maxHide = barHeight();
          const next = Math.min(hideOffsetRef.current + delta, maxHide);
          applyHideOffset(next);
        } else if (delta < 0) {
          // Any upward scroll fully reveals with a slide-in animation.
          revealAtOnce();
        }
      } else if (pinnedRef.current) {
        resetHide();
      }

      lastScrollY.current = y;
    };

    bar.dataset.pinned = "false";
    bar.dataset.revealing = "false";
    bar.style.transform = "translate3d(0,0,0)";

    const resizeObserver = new ResizeObserver(() => {
      if (pinnedRef.current && hideOffsetRef.current > 0) {
        applyHideOffset(Math.min(hideOffsetRef.current, barHeight()));
      }
      syncSpacerHeight();
    });
    resizeObserver.observe(bar);

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    lastScrollY.current = window.scrollY;
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [anchorRef, barRef, spacerRef]);
}

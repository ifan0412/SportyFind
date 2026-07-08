"use client";

import { useEffect } from "react";

/** Prevent background page scroll while overlays (filters, modals) are open. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    const { body, documentElement } = document;
    const scrollY = window.scrollY;

    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      touchAction: body.style.touchAction,
      paddingRight: body.style.paddingRight,
    };

    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.touchAction = "none";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.touchAction = prev.touchAction;
      body.style.paddingRight = prev.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

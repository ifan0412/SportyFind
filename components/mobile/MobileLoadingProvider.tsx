"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { MobileLoadingBar } from "@/components/mobile/MobileLoadingBar";
import {
  isInternalNavigationHref,
  MOBILE_LOADING_NETWORK_TIMEOUT_MS,
  MOBILE_LOADING_SHOW_DELAY_MS,
  normalizeInternalPath,
} from "@/lib/mobile-loading";

type MobileLoadingContextValue = {
  startAction: () => void;
  stopAction: () => void;
  failWithNetworkError: () => void;
};

const MobileLoadingContext = createContext<MobileLoadingContextValue | null>(null);

export function useMobileLoading() {
  const ctx = useContext(MobileLoadingContext);
  if (!ctx) {
    throw new Error("useMobileLoading must be used within MobileLoadingProvider");
  }
  return ctx;
}

export function useOptionalMobileLoading() {
  return useContext(MobileLoadingContext);
}

export function MobileLoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const pendingRef = useRef(0);
  const targetPathRef = useRef<string | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const networkTimerRef = useRef<number | null>(null);
  const pathnameRef = useRef(pathname);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (networkTimerRef.current != null) {
      window.clearTimeout(networkTimerRef.current);
      networkTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    pendingRef.current = 0;
    targetPathRef.current = null;
    clearTimers();
    setVisible(false);
    setNetworkError(false);
  }, [clearTimers]);

  const scheduleNetworkTimeout = useCallback(() => {
    if (networkTimerRef.current != null) return;
    networkTimerRef.current = window.setTimeout(() => {
      networkTimerRef.current = null;
      if (pendingRef.current <= 0) return;
      if (!window.navigator.onLine) {
        setNetworkError(true);
        setVisible(true);
      }
    }, MOBILE_LOADING_NETWORK_TIMEOUT_MS);
  }, []);

  const beginPending = useCallback(
    (targetPath?: string | null) => {
      if (!window.matchMedia("(max-width: 767px)").matches) return;

      pendingRef.current += 1;
      if (targetPath) targetPathRef.current = targetPath;
      setNetworkError(false);

      if (showTimerRef.current == null) {
        showTimerRef.current = window.setTimeout(() => {
          showTimerRef.current = null;
          if (pendingRef.current > 0) setVisible(true);
        }, MOBILE_LOADING_SHOW_DELAY_MS);
      }

      scheduleNetworkTimeout();
    },
    [scheduleNetworkTimeout]
  );

  const endPending = useCallback(() => {
    pendingRef.current = Math.max(0, pendingRef.current - 1);
    if (pendingRef.current === 0) reset();
  }, [reset]);

  const startAction = useCallback(() => {
    beginPending(null);
  }, [beginPending]);

  const stopAction = useCallback(() => {
    endPending();
  }, [endPending]);

  const failWithNetworkError = useCallback(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    pendingRef.current = Math.max(pendingRef.current, 1);
    clearTimers();
    setNetworkError(true);
    setVisible(true);
    window.setTimeout(reset, 4000);
  }, [clearTimers, reset]);

  const startNavigation = useCallback(
    (href: string) => {
      const normalized = normalizeInternalPath(href);
      if (normalized === pathnameRef.current) return;
      beginPending(normalized);
    },
    [beginPending]
  );

  useEffect(() => {
    pathnameRef.current = pathname;
    reset();
  }, [pathname, reset]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!isInternalNavigationHref(href)) return;

      startNavigation(href);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [startNavigation]);

  useEffect(() => {
    const onOffline = () => {
      if (pendingRef.current > 0) {
        clearTimers();
        setNetworkError(true);
        setVisible(true);
      }
    };

    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, [clearTimers]);

  const value = useMemo<MobileLoadingContextValue>(
    () => ({
      startAction,
      stopAction,
      failWithNetworkError,
    }),
    [failWithNetworkError, startAction, stopAction]
  );

  return (
    <MobileLoadingContext.Provider value={value}>
      {children}
      <MobileLoadingBar visible={visible} networkError={networkError} />
    </MobileLoadingContext.Provider>
  );
}

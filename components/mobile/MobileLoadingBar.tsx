"use client";

import Image from "next/image";
import { MOBILE_LOADING_NETWORK_MESSAGE } from "@/lib/mobile-loading";

interface MobileLoadingBarProps {
  visible: boolean;
  networkError: boolean;
}

export function MobileLoadingBar({ visible, networkError }: MobileLoadingBarProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!networkError}
      className="fixed inset-0 z-[120] md:hidden flex items-center justify-center pointer-events-none"
    >
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/icon-512.png"
          alt=""
          width={40}
          height={40}
          className={
            networkError
              ? "size-10 rounded-md object-contain opacity-80"
              : "size-10 rounded-md object-contain animate-[sportyfind-logo-bounce_1.1s_ease-in-out_infinite]"
          }
          priority
        />

        {!networkError ? (
          <div className="h-1 w-28 overflow-hidden rounded-full bg-slate-800/80">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-500 via-orange-500 to-blue-500 animate-[sportyfind-loading-bar_1.2s_ease-in-out_infinite]" />
          </div>
        ) : (
          <p className="text-center text-xs font-bold text-orange-400 max-w-[220px]">
            {MOBILE_LOADING_NETWORK_MESSAGE}
          </p>
        )}
      </div>
    </div>
  );
}

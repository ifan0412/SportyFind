"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAppChromeStickyTop } from "@/lib/use-app-chrome-sticky-top";

type AppChromeStickyProps = {
  children: ReactNode;
  className?: string;
  /** Tailwind `top` for md+ when inline mobile top is cleared */
  desktopTopClass?: string;
  enabled?: boolean;
};

export function AppChromeSticky({
  children,
  className,
  desktopTopClass = "md:top-20",
  enabled = true,
}: AppChromeStickyProps) {
  const ref = useRef<HTMLDivElement>(null);
  useAppChromeStickyTop(ref, enabled);

  return (
    <div ref={ref} className={cn("sticky z-30", desktopTopClass, className)}>
      {children}
    </div>
  );
}

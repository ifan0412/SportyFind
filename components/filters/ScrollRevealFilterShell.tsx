"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LISTING_PAGE_MAX_WIDTH } from "@/lib/listing-sections";
import { useScrollRevealFilter } from "@/lib/use-scroll-reveal-filter";

interface ScrollRevealFilterShellProps {
  children: ReactNode;
  className?: string;
  /** Inner max-width when pinned (defaults to listing pages). */
  containerClassName?: string;
}

/**
 * Wraps listing search/filter UI. After scrolling past the bar, it pins below the
 * navbar. Hides progressively while scrolling down (1:1 with scroll distance);
 * slides fully back in at once when the user scrolls up.
 *
 * Pinned state keeps the same size, padding, and styling as the in-flow filter —
 * only position changes (fixed below navbar).
 */
export function ScrollRevealFilterShell({
  children,
  className,
  containerClassName = LISTING_PAGE_MAX_WIDTH,
}: ScrollRevealFilterShellProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useScrollRevealFilter(anchorRef, barRef, spacerRef);

  return (
    <>
      <div ref={anchorRef} className="h-0 w-full" aria-hidden />
      <div ref={spacerRef} className="w-full" style={{ height: 0 }} aria-hidden />
      <div
        ref={barRef}
        data-pinned="false"
        className={cn(
          "group/bar z-40",
          "data-[pinned=true]:will-change-transform",
          "data-[pinned=true]:fixed data-[pinned=true]:left-0 data-[pinned=true]:right-0",
          // Transition only when sliding back in on scroll-up.
          "data-[revealing=true]:transition-transform data-[revealing=true]:duration-200",
          "data-[revealing=true]:ease-[cubic-bezier(0.32,0.72,0,1)]",
          className
        )}
      >
        <div
          className={cn(
            containerClassName,
            "mx-auto w-full",
            // In-flow: no extra box — children layout exactly as without the shell.
            "group-data-[pinned=false]/bar:contents",
            // Pinned: match the page container width + horizontal padding.
            "group-data-[pinned=true]/bar:block",
            "group-data-[pinned=true]/bar:px-4 group-data-[pinned=true]/bar:sm:px-6 group-data-[pinned=true]/bar:lg:px-8"
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}

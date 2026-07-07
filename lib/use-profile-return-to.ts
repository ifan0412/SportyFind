"use client";

import { usePathname, useSearchParams } from "next/navigation";

/** Current path + query string, for profile deep-link back navigation */
export function useProfileReturnTo(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

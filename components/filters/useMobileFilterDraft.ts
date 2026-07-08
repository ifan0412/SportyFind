"use client";

import { useCallback, useRef, useState } from "react";
import type { MobileFilterValues } from "./types";

export function useMobileFilterDraft(applied: MobileFilterValues) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<MobileFilterValues>(applied);
  const appliedRef = useRef(applied);
  appliedRef.current = applied;

  const open = useCallback(() => {
    setDraft(appliedRef.current);
    setIsOpen(true);
  }, []);

  const cancel = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    draft,
    setDraft,
    open,
    cancel,
    close: cancel,
  };
}

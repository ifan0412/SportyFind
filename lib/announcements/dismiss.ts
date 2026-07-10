import type { PopupDismissMode } from "@/lib/announcements/types";

const DISMISS_PREFIX = "sf-popup-dismiss";

function storageForMode(mode: PopupDismissMode): Storage | null {
  if (mode === "until_end") return null;
  if (typeof window === "undefined") return null;
  return mode === "session" ? sessionStorage : localStorage;
}

export function isPopupDismissed(id: string, mode: PopupDismissMode): boolean {
  const storage = storageForMode(mode);
  if (!storage) return false;
  try {
    return storage.getItem(`${DISMISS_PREFIX}-${id}`) === "1";
  } catch {
    return false;
  }
}

export function dismissPopup(id: string, mode: PopupDismissMode): void {
  const storage = storageForMode(mode);
  if (!storage) return;
  try {
    storage.setItem(`${DISMISS_PREFIX}-${id}`, "1");
  } catch {
    /* ignore */
  }
}

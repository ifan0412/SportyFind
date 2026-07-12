export function isClient(): boolean {
  return typeof window !== "undefined";
}

export function isIOS(): boolean {
  if (!isClient()) return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  if (!isClient()) return false;
  return /Android/i.test(navigator.userAgent);
}

/** Installed PWA / Add to Home Screen on iOS. */
export function isStandalonePwa(): boolean {
  if (!isClient()) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export function supportsWebPush(): boolean {
  if (!isClient()) return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS Safari requires A2HS before web push (16.4+). */
export function needsIosHomeScreenFirst(): boolean {
  return isIOS() && !isStandalonePwa();
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isClient() || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function canPromptForPush(): boolean {
  if (!supportsWebPush()) return false;
  if (needsIosHomeScreenFirst()) return false;
  const perm = getNotificationPermission();
  return perm === "default" || perm === "granted";
}

export function isPushBlocked(): boolean {
  return getNotificationPermission() === "denied";
}

/** Best-effort open of OS notification settings (Android TWA / limited browsers). */
export function openNotificationSettingsHint(): void {
  if (!isClient()) return;
  if (isAndroid()) {
    window.open("app-settings:", "_blank");
  }
}

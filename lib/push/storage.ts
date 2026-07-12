export const PUSH_REMINDER_DISMISSED_KEY = "sportyfind_push_reminder_dismissed";

export function readLocalPushReminderDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PUSH_REMINDER_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLocalPushReminderDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PUSH_REMINDER_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearLocalPushReminderDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PUSH_REMINDER_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

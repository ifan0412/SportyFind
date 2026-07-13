/** Human-readable Supabase / auth errors for toasts. */
export function formatAuthError(error: unknown, fallback = "操作失敗，請稍後再試。"): string {
  if (!error) return fallback;
  if (typeof error === "string") return error || fallback;

  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    const message = e.message;
    if (typeof message === "string" && message.trim()) return message;

    const nested = e.error;
    if (typeof nested === "string" && nested.trim()) return nested;
    if (typeof nested === "object" && nested !== null) {
      const desc = (nested as Record<string, unknown>).message ?? (nested as Record<string, unknown>).description;
      if (typeof desc === "string" && desc.trim()) return desc;
    }

    const description = e.error_description;
    if (typeof description === "string" && description.trim()) return description;

    const code = e.code;
    if (code === 401 || code === "401") {
      return "API 金鑰無效。Staging 請確認 Vercel Preview 的 Supabase URL 與 anon key 配對後重新部署。";
    }
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

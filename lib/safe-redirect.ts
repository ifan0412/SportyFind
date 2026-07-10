const DEFAULT_SAFE_PATH = "/profile";

/** Allow only same-origin relative paths (blocks open redirects). */
export function safeRedirectPath(raw: string | null | undefined, fallback = DEFAULT_SAFE_PATH): string {
  const value = (raw ?? "").trim();
  if (!value) return fallback;

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || value.includes("\0")) {
    return fallback;
  }

  try {
    const url = new URL(value, "http://local.invalid");
    if (url.origin !== "http://local.invalid") {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export type AppEnv = "production" | "staging" | "development";

/** Explicit override via NEXT_PUBLIC_APP_ENV, else infer from Vercel / NODE_ENV. */
export function getAppEnv(): AppEnv {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV;
  if (explicit === "production" || explicit === "staging" || explicit === "development") {
    return explicit;
  }

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "staging";

  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}

export function isStagingEnv(): boolean {
  return getAppEnv() === "staging";
}

export function isProductionEnv(): boolean {
  return getAppEnv() === "production";
}

export function stagingBannerLabel(): string {
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) return `Staging · ${vercelUrl}`;
  return "Staging environment — not production";
}

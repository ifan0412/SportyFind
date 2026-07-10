/** True when the browser fetch layer failed (offline, aborted, CORS, etc.). */
export function isNetworkFetchError(error: unknown): boolean {
  return error instanceof TypeError && error.message === "Failed to fetch";
}

/** Await a promise; return fallback instead of rejecting on transient network errors. */
export async function safeAwait<T>(promise: PromiseLike<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isNetworkFetchError(error)) return fallback;
    throw error;
  }
}

/** Supabase query helper — swallows transient network failures as empty results. */
export async function safeSupabaseQuery<T extends { data: unknown }>(
  query: PromiseLike<T>
): Promise<T> {
  try {
    return await query;
  } catch (error) {
    if (isNetworkFetchError(error)) {
      return { data: null, error: { message: "Failed to fetch" } } as unknown as T;
    }
    throw error;
  }
}

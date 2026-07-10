import { useCallback, useRef, useState } from "react";

/**
 * Prevents duplicate form submissions when users click save/create multiple times
 * while a request is in flight. After success, stays locked until unmount (navigation).
 */
export function useSubmitOnce() {
  const inFlightRef = useRef(false);
  const completedRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const run = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options?: { lockOnSuccess?: boolean }
    ): Promise<T | undefined> => {
      const lockOnSuccess = options?.lockOnSuccess !== false;
      if (inFlightRef.current || completedRef.current) return undefined;

      inFlightRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await fn();
        if (lockOnSuccess) {
          completedRef.current = true;
        }
        return result;
      } catch (error) {
        inFlightRef.current = false;
        throw error;
      } finally {
        if (!completedRef.current) {
          inFlightRef.current = false;
          setIsSubmitting(false);
        }
      }
    },
    []
  );

  return { run, isSubmitting };
}

/** Synchronous guard for handlers that manage their own loading state. */
export function useActionLock() {
  const lockRef = useRef(false);

  const tryLock = useCallback(() => {
    if (lockRef.current) return false;
    lockRef.current = true;
    return true;
  }, []);

  const unlock = useCallback(() => {
    lockRef.current = false;
  }, []);

  const isLocked = useCallback(() => lockRef.current, []);

  return { tryLock, unlock, isLocked };
}

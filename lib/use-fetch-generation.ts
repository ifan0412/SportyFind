import { useCallback, useMemo, useRef } from "react";

/** Ignore stale async fetch results when multiple loads overlap (e.g. realtime + manual refresh). */
export function useFetchGeneration() {
  const generationRef = useRef(0);

  const nextGeneration = useCallback(() => {
    generationRef.current += 1;
    return generationRef.current;
  }, []);

  const isCurrent = useCallback((generation: number) => generation === generationRef.current, []);

  const invalidate = useCallback(() => {
    generationRef.current += 1;
  }, []);

  return useMemo(
    () => ({ nextGeneration, isCurrent, invalidate }),
    [nextGeneration, isCurrent, invalidate]
  );
}

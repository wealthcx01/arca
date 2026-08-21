import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Periodically fetches data from an API endpoint.
 * Returns { data, loading, error, refetch }.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs = 60_000,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // ARCA-65. `doFetch` was recreated every render, so naming it as a dependency of the effect below
  // would clear and recreate the interval on every render — the fix that produces the bug.
  //
  // Instead the latest `fetcher` is kept in a ref and `doFetch` is stable. The effect re-runs on
  // exactly what it did before (`intervalMs` and the caller's `deps`), still calls the freshest
  // fetcher, and the dependency list is now true rather than convenient.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const doFetch = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Fetch failed");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    doFetch();

    const timer = setInterval(doFetch, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [intervalMs, doFetch, ...deps]);

  return { data, loading, error, refetch: doFetch };
}

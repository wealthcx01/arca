import { useEffect, useRef, useState } from "react";

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

  const doFetch = async () => {
    try {
      const result = await fetcher();
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
  };

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    doFetch();

    const timer = setInterval(doFetch, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [intervalMs, ...deps]);

  return { data, loading, error, refetch: doFetch };
}

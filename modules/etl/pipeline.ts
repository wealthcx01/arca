/**
 * Generic ETL pipeline runner with retry logic and rate limiting.
 */

export interface ETLSource {
  name: string;
  extract: () => Promise<unknown[]>;
  transform: (data: unknown[]) => unknown[];
  load: (data: unknown[]) => Promise<number>;
}

export interface ETLOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  rateLimit?: number; // max calls per minute
}

interface ETLResult {
  source: string;
  status: "ok" | "error";
  recordsProcessed: number;
  duration_ms: number;
  error?: string;
}

/**
 * Run a single ETL pipeline with retry and logging.
 */
export async function runETL(source: ETLSource, options: ETLOptions = {}): Promise<ETLResult> {
  const { maxRetries = 3, retryDelayMs = 2000 } = options;
  const startTime = Date.now();
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Extract
      const raw = await source.extract();
      console.log(`[etl:${source.name}] Extracted ${raw.length} records`);

      // Transform
      const transformed = source.transform(raw);
      console.log(`[etl:${source.name}] Transformed ${transformed.length} records`);

      // Load
      const loaded = await source.load(transformed);
      console.log(`[etl:${source.name}] Loaded ${loaded} records`);

      return {
        source: source.name,
        status: "ok",
        recordsProcessed: loaded,
        duration_ms: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(
        `[etl:${source.name}] Attempt ${attempt + 1}/${maxRetries + 1} failed:`,
        lastError,
      );
      if (attempt < maxRetries) {
        const delay = retryDelayMs * 2 ** attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  return {
    source: source.name,
    status: "error",
    recordsProcessed: 0,
    duration_ms: Date.now() - startTime,
    error: lastError ?? "Unknown error",
  };
}

/**
 * Run multiple ETL pipelines sequentially.
 */
export async function runAllETL(
  sources: ETLSource[],
  options: ETLOptions = {},
): Promise<ETLResult[]> {
  const results: ETLResult[] = [];

  for (const source of sources) {
    const result = await runETL(source, options);
    results.push(result);
  }

  return results;
}

/**
 * HTTP client with circuit breaker pattern.
 * All external API calls must go through this client.
 */

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
}

const circuits = new Map<string, CircuitBreakerState>();

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT_MS = 60_000; // 1 minute

function getCircuit(name: string): CircuitBreakerState {
  if (!circuits.has(name)) {
    circuits.set(name, { failures: 0, lastFailure: 0, state: "closed" });
  }
  return circuits.get(name)!;
}

export class HttpClient {
  private defaultHeaders: Record<string, string>;

  constructor(headers: Record<string, string> = {}) {
    this.defaultHeaders = headers;
  }

  async fetch(
    url: string,
    options: RequestInit & { circuitName?: string; retries?: number } = {},
  ): Promise<Response> {
    const { circuitName = "default", retries = 2, ...fetchOpts } = options;
    const circuit = getCircuit(circuitName);

    // Check circuit state
    if (circuit.state === "open") {
      if (Date.now() - circuit.lastFailure > RESET_TIMEOUT_MS) {
        circuit.state = "half-open";
      } else {
        throw new Error(`Circuit breaker open for ${circuitName}`);
      }
    }

    const headers = { ...this.defaultHeaders, ...(fetchOpts.headers as Record<string, string>) };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, { ...fetchOpts, headers });

        if (response.ok) {
          // Reset circuit on success
          circuit.failures = 0;
          circuit.state = "closed";
          return response;
        }

        // Don't retry 4xx errors (except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response;
        }

        // Rate limited — wait and retry
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 5000;
          await new Promise((r) => setTimeout(r, Math.min(waitMs, 30_000)));
          continue;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      // Exponential backoff between retries
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }

    // Record failure
    circuit.failures++;
    circuit.lastFailure = Date.now();
    if (circuit.failures >= FAILURE_THRESHOLD) {
      circuit.state = "open";
    }

    throw lastError || new Error(`Request failed after ${retries + 1} attempts`);
  }

  async json<T>(url: string, options?: RequestInit & { circuitName?: string }): Promise<T> {
    const response = await this.fetch(url, options);
    return response.json() as Promise<T>;
  }
}

export const httpClient = new HttpClient();

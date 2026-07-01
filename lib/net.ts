/**
 * Resilient JSON fetch used by every external call in the app.
 *
 * Adds, on top of the platform `fetch`:
 *  - a request timeout (its own `AbortController`, composed with the caller's),
 *  - retry with exponential backoff + jitter on network errors and HTTP 429/5xx
 *    (honouring `Retry-After`), never on other 4xx,
 *  - a small in-memory response cache (opt-in via `cacheTtlMs`).
 *
 * Runs in the browser; there is no filesystem or shared server cache. The cache
 * is a module-level `Map`, so it lives for the lifetime of the tab.
 */

export interface FetchJSONOpts {
  /** caller's abort signal — composed with the internal timeout */
  signal?: AbortSignal;
  /** per-attempt timeout in ms (default 8000) */
  timeoutMs?: number;
  /** extra attempts after the first, on retryable failures (default 2) */
  retries?: number;
  /** cache identity; defaults to `url`. Pass when several URLs are equivalent. */
  cacheKey?: string;
  /** when set, serve a fresh cached value and store successful responses */
  cacheTtlMs?: number;
  /** passed through to `fetch` (method, body, headers, …) */
  init?: RequestInit;
}

/** Thrown on final failure; `status` is set for HTTP errors. */
export class FetchError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Backoff for attempt N (0-based): ~400ms, 800ms, 1600ms … plus jitter. */
function backoffMs(attempt: number): number {
  return 400 * 2 ** attempt + Math.random() * 250;
}

/** Parse a `Retry-After` header (seconds, or an HTTP date) to ms, if present. */
function retryAfterMs(res: Response): number | undefined {
  const raw = res.headers.get("retry-after");
  if (!raw) return undefined;
  const secs = Number(raw);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const when = Date.parse(raw);
  return Number.isFinite(when) ? Math.max(0, when - Date.now()) : undefined;
}

/** Sleep that rejects promptly if the caller aborts. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function fetchJSON<T>(
  url: string,
  opts: FetchJSONOpts = {},
): Promise<T> {
  const {
    signal,
    timeoutMs = 8000,
    retries = 2,
    cacheKey,
    cacheTtlMs,
    init,
  } = opts;
  const key = cacheKey ?? url;

  if (cacheTtlMs) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  }

  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        const err = new FetchError(`HTTP ${res.status}`, res.status);
        if (retryable && attempt < retries) {
          lastErr = err;
          await delay(retryAfterMs(res) ?? backoffMs(attempt), signal);
          continue;
        }
        throw err; // non-retryable 4xx, or out of attempts
      }
      const value = (await res.json()) as T;
      // never cache errors — only successful responses
      if (cacheTtlMs) cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
      return value;
    } catch (err) {
      // caller cancelled — propagate immediately, don't retry
      if (signal?.aborted) throw err;
      // an HTTP error already ruled non-retryable above — surface it
      if (err instanceof FetchError) throw err;
      // network error, timeout, or JSON parse failure — retry if attempts remain
      lastErr = err;
      if (attempt < retries) {
        await delay(backoffMs(attempt), signal);
        continue;
      }
      throw new FetchError(
        err instanceof Error ? err.message : "Network request failed",
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  // unreachable in practice — the loop always returns or throws
  throw lastErr instanceof Error ? lastErr : new FetchError("Request failed");
}

/** Test/maintenance helper: clear the in-memory response cache. */
export function clearFetchCache(): void {
  cache.clear();
}

/**
 * Pluggable observability seam.
 *
 * The app is client-only with no backend, so these are the single place that
 * knows a failure or an empty result happened. The default implementation logs
 * in development and is a no-op in production; the marked seams are where a real
 * sink (Sentry, an analytics endpoint) gets wired in later via env, without
 * touching the call sites.
 */

const isDev = process.env.NODE_ENV !== "production";

/** Present when a real sink is configured; the seam below reads it. */
const SINK_DSN = process.env.NEXT_PUBLIC_TELEMETRY_DSN;

/** Report a handled failure with a short, stable context label. */
export function reportError(context: string, err: unknown): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(`[skydeck] error · ${context}`, err);
  }
  // SEAM: when SINK_DSN is set, forward to the error sink, e.g.
  //   Sentry.captureException(err, { tags: { context } });
  void SINK_DSN;
}

/** Report a noteworthy non-error event (empty results, degraded paths). */
export function reportEvent(name: string, data?: Record<string, unknown>): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(`[skydeck] event · ${name}`, data ?? {});
  }
  // SEAM: when SINK_DSN is set, forward to the analytics sink, e.g.
  //   analytics.track(name, data);
  void SINK_DSN;
}

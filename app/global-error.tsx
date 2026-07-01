"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/telemetry";

/**
 * Root error boundary — the last line of defence, catching failures that escape
 * the route boundary (including in the root layout). It must render its own
 * <html>/<body>, since it replaces the whole document tree.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError("app_global_error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070d",
          color: "#fff",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          padding: "0 24px",
        }}
      >
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Sky Deck hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              width: "100%",
              borderRadius: 999,
              border: "none",
              background: "rgba(255,255,255,0.9)",
              color: "#05070d",
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

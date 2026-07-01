"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/telemetry";

/**
 * Route-level error boundary. Catches an unexpected throw in any client
 * component so a single failure degrades to a friendly, recoverable screen
 * instead of blanking the whole app.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError("app_error_boundary", error);
  }, [error]);

  return (
    <main className="flex h-full w-full items-center justify-center bg-[#05070d] px-6">
      <div className="fresnel glass-panel max-w-[360px] rounded-3xl p-6 text-center">
        <h1 className="text-[17px] font-semibold tracking-tight text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/60">
          The sky feed hit an unexpected error. You can try again — your last
          location is remembered.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 w-full rounded-full bg-white/90 py-2.5 text-[13px] font-semibold tracking-tight text-[#05070d] transition-transform active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

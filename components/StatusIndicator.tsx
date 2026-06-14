"use client";

import { STATUS_META, type StatusLevel } from "@/lib/skyData";

/**
 * Quality cue: a single colour-coded dot. The qualitative tier word
 * (Exceptional / Excellent / Good / Average) is intentionally not shown — the
 * dot's colour and glow carry the signal on their own.
 */
export default function StatusIndicator({ status }: { status: StatusLevel }) {
  const meta = STATUS_META[status];

  return (
    <span
      className="relative flex h-2 w-2 items-center justify-center"
      role="img"
      aria-label="viewing-quality indicator"
    >
      {meta.animation === "pulse" && (
        <span
          className="absolute h-2 w-2 rounded-full"
          style={{
            background: meta.color,
            animation: "indicatorPulse 2.2s ease-out infinite",
          }}
        />
      )}
      <span
        className="relative h-2 w-2 rounded-full"
        style={{
          background: meta.color,
          boxShadow:
            meta.animation === "muted"
              ? "none"
              : `0 0 ${meta.animation === "glow" ? 8 : 5}px ${meta.color}`,
          opacity: meta.animation === "muted" ? 0.7 : 1,
        }}
      />
    </span>
  );
}

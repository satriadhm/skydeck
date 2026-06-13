"use client";

import { STATUS_META, type StatusLevel } from "@/lib/skyData";

export default function StatusIndicator({ status }: { status: StatusLevel }) {
  const meta = STATUS_META[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2 items-center justify-center">
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
      <span
        className="text-[12px] font-medium tracking-tight"
        style={{ color: meta.color, opacity: 0.92 }}
      >
        {meta.label}
      </span>
    </span>
  );
}

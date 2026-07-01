"use client";

import { type StatusLevel } from "@/lib/skyData";

/**
 * Live 0–100 atmospheric-score visuals. Two co-located presentational parts
 * share the same tier logic:
 *  - `ScoreDial` — a compact SVG ring with the number, for headline use.
 *  - `ScoreBar` — a small 4-segment bar (no number), for dense list rows.
 *
 * Quality is encoded with the mode accent (arc length + glow / filled
 * segments), never a traffic-light palette — the cinematic tone is kept.
 */

/** Glow intensity per tier — `exceptional` reads brightest. */
const GLOW: Record<StatusLevel, number> = {
  exceptional: 1,
  excellent: 0.66,
  good: 0.38,
  average: 0.16,
};

/** How many of the 4 segments a tier fills. */
const SEGMENTS: Record<StatusLevel, number> = {
  exceptional: 4,
  excellent: 3,
  good: 2,
  average: 1,
};

export function ScoreDial({
  score,
  accent,
  tier,
  loading = false,
  size = 40,
}: {
  score?: number;
  accent: string;
  tier?: StatusLevel;
  loading?: boolean;
  size?: number;
}) {
  const stroke = Math.max(3, Math.round(size * 0.08));
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const value = Math.round(score ?? 0);
  const offset = c * (1 - (score ?? 0) / 100);
  const glow = tier ? GLOW[tier] : 0.4;

  if (loading) {
    return (
      <span
        role="img"
        aria-label="Reading the sky"
        className="relative inline-flex flex-shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="animate-pulse">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.28} ${c}`}
            style={{
              opacity: 0.7,
              transform: "rotate(-90deg)",
              transformOrigin: "center",
            }}
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={`Sky score ${value} of 100, ${tier ?? "unrated"} conditions`}
      className="relative inline-flex flex-shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        {/* faint track ring underneath */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        {/* score arc, starting at 12 o'clock */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            filter: `drop-shadow(0 0 ${3 + glow * 5}px ${accent})`,
            opacity: 0.4 + glow * 0.6,
            transition: "stroke-dashoffset 0.6s ease, opacity 0.4s ease",
          }}
        />
      </svg>
      <span
        className="absolute font-semibold tabular-nums leading-none text-white"
        style={{ fontSize: Math.round(size * 0.34) }}
      >
        {value}
      </span>
    </span>
  );
}

export function ScoreBar({
  tier,
  accent,
}: {
  tier: StatusLevel;
  accent: string;
}) {
  const filled = SEGMENTS[tier];
  return (
    <span
      role="img"
      aria-label={`${tier} conditions`}
      className="inline-flex flex-shrink-0 items-center gap-[3px]"
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-[3px] w-[9px] rounded-full"
          style={{
            background: i < filled ? accent : "rgba(255,255,255,0.14)",
            boxShadow: i < filled ? `0 0 5px ${accent}88` : "none",
          }}
        />
      ))}
    </span>
  );
}

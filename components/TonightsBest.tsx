"use client";

import { motion, useReducedMotion } from "framer-motion";
import { isSameDay, startOfDay } from "@/lib/dateUtils";
import { scoreToStatus } from "@/lib/weather";
import { type DeckMode, type SkyMarker } from "@/lib/skyData";
import { ScoreDial } from "./ScoreDial";

/**
 * The single live-status surface. On load — once the feed flips live — this
 * surfaces the #1 ranked spot (its score, name, tagline) as a first-value
 * moment; tapping it flies the camera and opens that spot's detail. It also
 * carries the `FeedTag` pill, so no separate condition chip is needed.
 */

const NOUN: Record<DeckMode, string> = {
  sunrise: "sunrise",
  sunset: "sunset",
  night: "stargazing",
};

/** Grammatical, date-aware eyebrow across every mode + date. */
function eyebrow(mode: DeckMode, date: Date): string {
  const noun = NOUN[mode];
  if (isSameDay(date, startOfDay(new Date()))) return `Top ${noun} spot`;
  const label = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `Best ${noun} · ${label}`;
}

export default function TonightsBest({
  mode,
  top,
  status,
  date,
  accent,
  onSelect,
}: {
  mode: DeckMode;
  top: SkyMarker | null;
  status: "loading" | "live" | "sample";
  date: Date;
  accent: string;
  onSelect: (m: SkyMarker) => void;
}) {
  const reduceMotion = useReducedMotion();
  const loading = status === "loading";

  // nothing found (and not still loading) — the Best Places empty state owns
  // the "nothing here" message, so this surface stays out of the way.
  if (!top && !loading) return null;

  const tier = top ? scoreToStatus(top.score) : undefined;
  const noun = NOUN[mode];

  return (
    <motion.button
      type="button"
      onClick={() => top && onSelect(top)}
      disabled={loading}
      aria-label={top ? `Top ${noun} spot: ${top.name}` : "Reading the sky near you"}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fresnel glass-panel flex max-w-[min(420px,92vw)] items-center gap-3 rounded-3xl px-3.5 py-2.5 text-left transition-colors duration-200 enabled:hover:bg-white/[0.06]"
    >
      <ScoreDial
        score={top?.score}
        accent={accent}
        tier={tier}
        loading={loading}
        size={44}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
            {eyebrow(mode, date)}
          </span>
          <FeedTag status={status} date={date} />
        </div>
        <p className="mt-0.5 truncate text-[14px] font-bold tracking-tight text-white">
          {top ? top.name : "Reading the sky near you…"}
        </p>
        {top && (
          <p className="truncate text-[11.5px] leading-snug text-white/55">
            {top.tagline}
          </p>
        )}
      </div>
    </motion.button>
  );
}

/** Tiny pill: live now, forecast/archive for other days, or loading/sample. */
export function FeedTag({
  status,
  date,
}: {
  status: "loading" | "live" | "sample";
  date: Date;
}) {
  // share the feed's "today" source so the Live/Forecast/Archive boundary
  // lines up with the day switcher.
  const today = startOfDay(new Date());
  const meta =
    status === "loading"
      ? { label: "Syncing", color: "#9AA3B2", glow: false, pulse: true }
      : status === "sample"
        ? { label: "Sample", color: "#9AA3B2", glow: false, pulse: false }
        : isSameDay(date, today)
          ? { label: "Live", color: "#7DF9C1", glow: true, pulse: false }
          : date > today
            ? { label: "Forecast", color: "#9CE7FF", glow: true, pulse: false }
            : { label: "Archive", color: "#FFD76A", glow: true, pulse: false };

  return (
    <span className="flex flex-shrink-0 items-center gap-1 border-l border-white/15 pl-1.5">
      <span
        className="h-1 w-1 rounded-full"
        style={{
          background: meta.color,
          boxShadow: meta.glow ? `0 0 6px ${meta.color}` : "none",
          animation: meta.pulse ? "indicatorPulse 1.6s ease-out infinite" : undefined,
        }}
      />
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
    </span>
  );
}

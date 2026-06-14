"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ATMOSPHERIC,
  DECK_TABS,
  type DeckMode,
  type SkyMarker,
} from "@/lib/skyData";
import PlacePhoto from "./PlacePhoto";

/**
 * Collapsible detail sidebar. Slides in from the left when a map marker is
 * selected, and collapses when dismissed.
 */
export default function MarkerDetail({
  marker,
  onClose,
}: {
  marker: SkyMarker | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {marker && (
        <motion.aside
          key={marker.id}
          initial={{ x: -360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -360, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="pointer-events-auto absolute bottom-4 left-4 top-[84px] z-40 flex w-[min(320px,calc(100vw-2rem))] sm:left-6 sm:top-[104px]"
        >
          <Panel marker={marker} onClose={onClose} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Panel({ marker, onClose }: { marker: SkyMarker; onClose: () => void }) {
  const mode = marker.mode as DeckMode;
  const tab = DECK_TABS.find((t) => t.mode === mode)!;
  const fallback = ATMOSPHERIC[mode];
  const accent = tab.accent;

  // marker overrides win; otherwise fall back to the mode default
  const condition = marker.metrics?.condition ?? fallback.condition;
  const facts = [
    { label: "Cloud Cover", value: marker.metrics?.cloudCover ?? fallback.cloudCover },
    { label: "Humidity", value: marker.metrics?.humidity ?? fallback.humidity },
    { label: "Moon Phase", value: marker.metrics?.moonPhase ?? fallback.moonPhase },
    { label: "Visibility", value: marker.metrics?.visibility ?? fallback.visibility },
  ];
  const highlights = marker.highlights ?? fallback.layers;

  const orientation = [
    { label: "Best window", value: marker.bestWindow },
    marker.facing && { label: "Facing", value: marker.facing },
    marker.elevation && { label: "Elevation", value: marker.elevation },
    marker.access && { label: "Access", value: marker.access },
  ].filter(Boolean) as { label: string; value: string }[];

  const lat = `${Math.abs(marker.lat).toFixed(2)}°S`;
  const lng = `${marker.lng.toFixed(2)}°E`;

  return (
    <div className="fresnel glass-panel relative max-h-full w-full self-start overflow-y-auto rounded-3xl p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
              />
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/55">
                {tab.label}
              </span>
            </span>
          </div>
          <h2 className="mt-1 text-[19px] font-semibold leading-tight tracking-tight text-white">
            {marker.name}
          </h2>
          <p className="mt-0.5 text-[12px] leading-snug text-white/55">
            {marker.tagline}
          </p>
          <p className="mt-1 text-[11px] tracking-tight text-white/40">
            {lat} · {lng}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse details"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ring-1 ring-white/15 transition-all duration-200 hover:bg-white/10 hover:ring-white/30"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-white/12">
        <PlacePhoto id={marker.id} lat={marker.lat} lng={marker.lng} mode={mode} />
      </div>

      <p className="mt-3 text-[13px] font-medium text-white/80">{condition}</p>

      {/* the core "what to expect in the sky" block */}
      <div className="mt-3 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-white/10">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: accent }}
        >
          What to expect
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/80">
          {marker.whatToExpect}
        </p>
      </div>

      {/* timing + orientation */}
      <dl className="mt-3 space-y-1.5">
        {orientation.map((o) => (
          <div key={o.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[11px] uppercase tracking-wider text-white/45">
              {o.label}
            </dt>
            <dd className="text-right text-[12.5px] font-medium tracking-tight text-white/85">
              {o.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {facts.map((f) => (
          <div
            key={f.label}
            className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
              {f.label}
            </p>
            <p className="mt-0.5 text-[13px] font-semibold tracking-tight text-white">
              {f.value}
            </p>
          </div>
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {highlights.map((h) => (
          <li
            key={h}
            className="flex items-start gap-2 text-[12px] leading-snug text-white/70"
          >
            <span
              className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
              style={{ background: accent }}
            />
            {h}
          </li>
        ))}
      </ul>
    </div>
  );
}

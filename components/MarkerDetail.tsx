"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ATMOSPHERIC,
  DECK_TABS,
  type DeckMode,
  type SkyMarker,
} from "@/lib/skyData";
import SkyScene from "./SkyScene";

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
          className="pointer-events-auto absolute left-4 top-1/2 z-40 w-[min(300px,calc(100vw-2rem))] -translate-y-1/2 sm:left-6"
        >
          <Panel marker={marker} onClose={onClose} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Panel({
  marker,
  onClose,
}: {
  marker: SkyMarker;
  onClose: () => void;
}) {
  const mode = marker.mode as DeckMode;
  const tab = DECK_TABS.find((t) => t.mode === mode)!;
  const data = ATMOSPHERIC[mode];
  const accent = tab.accent;

  const facts = [
    { label: "Cloud Cover", value: data.cloudCover },
    { label: "Humidity", value: data.humidity },
    { label: "Moon Phase", value: data.moonPhase },
    { label: "Visibility", value: data.visibility },
  ];

  const lat = `${Math.abs(marker.lat).toFixed(2)}°S`;
  const lng = `${marker.lng.toFixed(2)}°E`;

  return (
    <div className="fresnel glass-panel relative max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/55">
              {tab.label}
            </span>
          </div>
          <h2 className="mt-1 text-[19px] font-semibold leading-tight tracking-tight text-white">
            {marker.name}
          </h2>
          <p className="mt-0.5 text-[11.5px] tracking-tight text-white/50">
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
        <SkyScene mode={mode} />
      </div>

      <p className="mt-3 text-[13px] font-medium text-white/80">
        {data.condition}
      </p>

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
        {data.layers.map((layer) => (
          <li
            key={layer}
            className="flex items-start gap-2 text-[12px] leading-snug text-white/70"
          >
            <span
              className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
              style={{ background: accent }}
            />
            {layer}
          </li>
        ))}
      </ul>
    </div>
  );
}

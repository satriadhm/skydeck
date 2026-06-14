"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DECK_TABS, type DeckMode, type SkyMarker } from "@/lib/skyData";

/**
 * Curated, ranked "Best Places" browser for the active mode. Stays in sync
 * with the map: clicking/hovering a row drives the shared selected/hovered
 * state, and a marker selected on the map highlights its row here.
 *
 * Right-side floating panel on desktop, collapsible sheet on small screens.
 */
export default function BestPlaces({
  mode,
  places,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  mode: DeckMode;
  places: SkyMarker[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (m: SkyMarker) => void;
  onHover: (id: string | null) => void;
}) {
  const accent = DECK_TABS.find((t) => t.mode === mode)!.accent;
  const [open, setOpen] = useState(false);

  const rows = (
    <ul className="space-y-2" onMouseLeave={() => onHover(null)}>
      {places.map((p, i) => (
        <PlaceRow
          key={p.id}
          place={p}
          rank={i + 1}
          accent={accent}
          active={p.id === selectedId}
          emphasized={p.id === hoveredId}
          onSelect={() => onSelect(p)}
          onHover={() => onHover(p.id)}
        />
      ))}
    </ul>
  );

  return (
    <>
      {/* desktop: floating right panel, anchored so it never clips */}
      <div className="pointer-events-auto absolute bottom-4 right-4 top-[104px] z-30 hidden w-[288px] lg:block">
        <div className="fresnel glass-panel relative max-h-full overflow-y-auto rounded-3xl p-4">
          <Header accent={accent} count={places.length} />
          {rows}
        </div>
      </div>

      {/* mobile: collapsible sheet */}
      <div className="lg:hidden">
        {!open && !selectedId && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="fresnel glass-panel pointer-events-auto absolute right-4 top-[84px] z-40 flex items-center gap-2 rounded-full px-3.5 py-2"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <span className="text-[12px] font-semibold tracking-tight text-white">
              {places.length} Best Spots
            </span>
          </button>
        )}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fresnel glass-panel pointer-events-auto absolute inset-x-2 bottom-2 z-50 max-h-[62vh] overflow-y-auto rounded-3xl p-4"
            >
              <Header
                accent={accent}
                count={places.length}
                onClose={() => setOpen(false)}
              />
              {rows}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function Header({
  accent,
  count,
  onClose,
}: {
  accent: string;
  count: number;
  onClose?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
        />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          Best Places · {count}
        </span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse list"
          className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-white/15 transition-all duration-200 hover:bg-white/10 hover:ring-white/30"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

function PlaceRow({
  place,
  rank,
  accent,
  active,
  emphasized,
  onSelect,
  onHover,
}: {
  place: SkyMarker;
  rank: number;
  accent: string;
  active: boolean;
  emphasized: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const time = windowTime(place.bestWindow);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onHover}
        className="w-full rounded-2xl p-2.5 text-left transition-colors duration-200"
        style={{
          background: active
            ? `linear-gradient(150deg, ${accent}22, ${accent}0a)`
            : emphasized
              ? "rgba(255,255,255,0.06)"
              : "transparent",
          boxShadow: active ? `inset 0 0 0 1px ${accent}66` : "none",
        }}
      >
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
            style={{
              color: rank === 1 ? "#05070d" : "#fff",
              background: rank === 1 ? accent : "rgba(255,255,255,0.10)",
            }}
          >
            {rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13.5px] font-semibold tracking-tight text-white">
                {place.name}
              </span>
              {time && (
                <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium tabular-nums text-white/60">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.7" />
                    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                  </svg>
                  {time}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11.5px] leading-snug text-white/55">
              {place.tagline}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

/** Pull the HH:MM time (or range) out of a best-window string for the row badge. */
function windowTime(window: string): string | null {
  const times = window.match(/\d{1,2}:\d{2}/g);
  if (!times) return null;
  return times.length >= 2 ? `${times[0]}–${times[1]}` : times[0];
}

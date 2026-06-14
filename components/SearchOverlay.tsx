"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSkyData } from "./SkyDataProvider";
import { DECK_TABS, type DeckMode, type SkyMarker } from "@/lib/skyData";
import { geocode, type GeoResult } from "@/lib/places";

/**
 * Command-palette-style place search. Opens below the nav, filters every point
 * on the map (curated spots + live discovered places) by name, and on pick
 * flies the camera to it, opens its detail, and switches mode if needed.
 *
 * Rendered at the page level (not inside the nav) so the overflow-clipped,
 * transformed nav can't clip the dropdown.
 */
export default function SearchOverlay({
  open,
  mode,
  accent,
  onClose,
  onPick,
  onLocation,
}: {
  open: boolean;
  mode: DeckMode;
  accent: string;
  onClose: () => void;
  onPick: (m: SkyMarker) => void;
  /** jump the whole feed to a geocoded location worldwide */
  onLocation: (center: [number, number], name: string) => void;
}) {
  const { markers } = useSkyData();
  const [q, setQ] = useState("");
  const [geo, setGeo] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // one entry per place (markers repeat across modes for discovered spots)
  const places = useMemo(() => {
    const seen = new Map<string, SkyMarker>();
    for (const m of markers) if (!seen.has(m.name)) seen.set(m.name, m);
    return Array.from(seen.values());
  }, [markers]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? places.filter((p) => p.name.toLowerCase().includes(term))
      : places;
    return list.slice(0, 8);
  }, [q, places]);

  // focus on open, reset on close
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    setQ("");
    setGeo([]);
  }, [open]);

  // debounced worldwide geocoding
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setGeo([]);
      setGeoLoading(false);
      return;
    }
    const controller = new AbortController();
    setGeoLoading(true);
    const t = setTimeout(() => {
      geocode(term, controller.signal)
        .then((rows) => setGeo(rows))
        .catch(() => setGeo([]))
        .finally(() => setGeoLoading(false));
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const choose = (place: SkyMarker) => {
    // prefer the current mode's variant so we don't reframe unnecessarily
    const target =
      markers.find((m) => m.name === place.name && m.mode === mode) ?? place;
    onPick(target);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="pointer-events-auto fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* flex wrapper centres the panel; framer's transform on the panel
              would otherwise override a Tailwind -translate-x-1/2 and shove it
              off-screen */}
          <div className="pointer-events-none fixed inset-x-0 top-[74px] z-50 flex justify-center px-3 sm:top-[88px]">
          <motion.div
            role="dialog"
            aria-label="Search places"
            className="fresnel glass-panel pointer-events-auto w-[min(440px,100%)] overflow-hidden rounded-3xl p-2"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (results[0]) choose(results[0]);
              }}
              className="flex items-center gap-2 rounded-2xl bg-white/[0.06] px-3 ring-1 ring-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="1.8" opacity="0.6" />
                <path d="m20 20-3.2-3.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a place worldwide…"
                className="w-full bg-transparent py-2.5 text-[13.5px] text-white placeholder:text-white/40 focus:outline-none"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Clear"
                  className="text-white/40 transition-colors hover:text-white/80"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </form>

            <ul className="mt-1.5 max-h-[44vh] overflow-y-auto">
              {results.length > 0 && (
                <li className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  On this map
                </li>
              )}
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => choose(p)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.07]"
                  >
                    <span
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium tracking-tight text-white">
                        {p.name}
                      </span>
                      <span className="block truncate text-[11px] text-white/45">
                        {p.discovered ? labelFor(p) : p.tagline}
                      </span>
                    </span>
                  </button>
                </li>
              ))}

              {/* worldwide geocoding */}
              {(geo.length > 0 || geoLoading) && (
                <li className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Worldwide
                  {geoLoading && <span className="text-white/30 normal-case tracking-normal">searching…</span>}
                </li>
              )}
              {geo.map((g, i) => (
                <li key={`geo-${i}`}>
                  <button
                    type="button"
                    onClick={() => onLocation(g.center, g.name)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.07]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" aria-hidden>
                      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="white" strokeWidth="1.6" opacity="0.6" />
                      <circle cx="12" cy="10" r="2.4" stroke="white" strokeWidth="1.6" opacity="0.6" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-tight text-white">
                      {g.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-white/35">Go</span>
                  </button>
                </li>
              ))}

              {results.length === 0 && geo.length === 0 && !geoLoading && (
                <li className="px-3 py-4 text-center text-[12px] text-white/45">
                  {q.trim()
                    ? `No matches for “${q.trim()}”`
                    : "Search a spot, or any place worldwide"}
                </li>
              )}
            </ul>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Short descriptor for a discovered place row. */
function labelFor(p: SkyMarker): string {
  const kind = p.kind ? p.kind[0].toUpperCase() + p.kind.slice(1) : "Place";
  const modeLabel = DECK_TABS.find((t) => t.mode === p.mode)?.label ?? "";
  return p.elevation ? `${kind} · ${p.elevation}` : `${kind} · ${modeLabel}`;
}

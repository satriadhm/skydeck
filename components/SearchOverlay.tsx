"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSkyData } from "./SkyDataProvider";
import { DECK_TABS, type DeckMode, type SkyMarker } from "@/lib/skyData";

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
}: {
  open: boolean;
  mode: DeckMode;
  accent: string;
  onClose: () => void;
  onPick: (m: SkyMarker) => void;
}) {
  const { markers } = useSkyData();
  const [q, setQ] = useState("");
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

  // focus on open, reset query on close
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    setQ("");
  }, [open]);

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
          <motion.div
            role="dialog"
            aria-label="Search places"
            className="fresnel glass-panel pointer-events-auto fixed left-1/2 top-[78px] z-50 w-[min(440px,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-3xl p-2 sm:top-[88px]"
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
                placeholder="Search viewpoints, peaks, volcanoes…"
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
              {results.length === 0 && (
                <li className="px-3 py-4 text-center text-[12px] text-white/45">
                  No places match “{q.trim()}”
                </li>
              )}
            </ul>
          </motion.div>
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

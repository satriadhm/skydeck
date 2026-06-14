"use client";

import { useEffect, useReducer } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DECK_TABS, MARKERS, type DeckMode, type SkyMarker } from "@/lib/skyData";
import { useMap } from "./MapContext";

export default function MapMarkers({
  mode,
  markers = MARKERS,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  mode: DeckMode;
  /** live-enriched marker set; defaults to the authored samples */
  markers?: SkyMarker[];
  selectedId?: string | null;
  hoveredId?: string | null;
  onSelect?: (marker: SkyMarker) => void;
  onHover?: (id: string | null) => void;
}) {
  const map = useMap();
  const accent = DECK_TABS.find((t) => t.mode === mode)!.accent;
  const visible = markers.filter((m) => m.mode === mode);

  // re-project on every camera change so markers stay pinned to the terrain
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!map) return;
    const onMove = () => bump();
    map.on("move", onMove);
    map.on("zoom", onMove);
    map.on("rotate", onMove);
    bump();
    return () => {
      map.off("move", onMove);
      map.off("zoom", onMove);
      map.off("rotate", onMove);
    };
  }, [map]);

  if (!map) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <AnimatePresence mode="popLayout">
        {visible.map((m) => {
          const p = map.project([m.lng, m.lat]);
          const isSelected = m.id === selectedId;
          const isHovered = m.id === hoveredId;
          const emphasized = isSelected || isHovered;
          // discovered OSM places render lighter, with the label only on hover,
          // so the map can carry many of them without crowding the curated spots
          const discovered = m.discovered;
          return (
            <motion.div
              key={m.id}
              className="pointer-events-none absolute"
              style={{ left: p.x, top: p.y }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <button
                type="button"
                onClick={() => onSelect?.(m)}
                onMouseEnter={() => onHover?.(m.id)}
                onMouseLeave={() => onHover?.(null)}
                aria-label={`View details for ${m.name}`}
                aria-pressed={isSelected}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer outline-none"
              >
                {/* soft halo to lift the marker off the terrain */}
                <span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all"
                  style={{
                    width: emphasized ? 44 : discovered ? 20 : 32,
                    height: emphasized ? 44 : discovered ? 20 : 32,
                    background: `radial-gradient(circle, ${accent}${
                      emphasized ? "66" : discovered ? "2a" : "40"
                    } 0%, transparent 70%)`,
                  }}
                />
                <span
                  className="block rounded-full ring-2 transition-transform"
                  style={{
                    width: discovered ? 7 : 10,
                    height: discovered ? 7 : 10,
                    background: discovered ? "#fff" : accent,
                    // hollow-ish white pin for discovered, solid accent for curated
                    boxShadow: discovered
                      ? `0 0 7px ${accent}`
                      : `0 0 12px ${accent}`,
                    opacity: discovered && !emphasized ? 0.8 : 1,
                    transform: emphasized
                      ? "scale(1.35)"
                      : discovered
                        ? "scale(0.9)"
                        : "scale(1)",
                    borderColor: "rgba(255,255,255,0.5)",
                  }}
                />
                {/* label chip — always shown for curated spots; only on hover for
                    discovered ones, to keep the dense field legible */}
                {(!discovered || emphasized) && (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap">
                    <div
                      className="glass-panel flex items-center rounded-full px-2.5 py-1 transition-colors"
                      style={{ borderColor: emphasized ? accent : undefined }}
                    >
                      <span className="text-[11px] font-medium tracking-tight text-white/90">
                        {m.name}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

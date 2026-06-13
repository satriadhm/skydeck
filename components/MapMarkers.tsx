"use client";

import { useEffect, useReducer } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DECK_TABS, MARKERS, type DeckMode, type SkyMarker } from "@/lib/skyData";
import { useMap } from "./MapContext";

export default function MapMarkers({
  mode,
  selectedId,
  onSelect,
}: {
  mode: DeckMode;
  selectedId?: string | null;
  onSelect?: (marker: SkyMarker) => void;
}) {
  const map = useMap();
  const accent = DECK_TABS.find((t) => t.mode === mode)!.accent;
  const visible = MARKERS.filter((m) => m.mode === mode);

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
    <div className="absolute inset-0 z-10">
      <AnimatePresence mode="popLayout">
        {visible.map((m) => {
          const p = map.project([m.lng, m.lat]);
          const isSelected = m.id === selectedId;
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
                aria-label={`View details for ${m.name}`}
                aria-pressed={isSelected}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer outline-none"
              >
                {/* soft static halo to lift the marker off the terrain */}
                <span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all"
                  style={{
                    width: isSelected ? 44 : 32,
                    height: isSelected ? 44 : 32,
                    background: `radial-gradient(circle, ${accent}${
                      isSelected ? "66" : "40"
                    } 0%, transparent 70%)`,
                  }}
                />
                <span
                  className="block h-2.5 w-2.5 rounded-full ring-2 ring-white/50 transition-transform"
                  style={{
                    background: accent,
                    boxShadow: `0 0 12px ${accent}`,
                    transform: isSelected ? "scale(1.35)" : "scale(1)",
                  }}
                />
                {/* label chip */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap">
                  <div
                    className="glass-panel flex items-center rounded-full px-2.5 py-1 transition-colors"
                    style={{
                      borderColor: isSelected ? accent : undefined,
                    }}
                  >
                    <span className="text-[11px] font-medium tracking-tight text-white/90">
                      {m.name}
                    </span>
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

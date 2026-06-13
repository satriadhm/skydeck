"use client";

import { useEffect, useReducer } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DECK_TABS, MARKERS, type DeckMode } from "@/lib/skyData";
import { useMap } from "./MapContext";

export default function MapMarkers({ mode }: { mode: DeckMode }) {
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
    <div className="pointer-events-none absolute inset-0 z-10">
      <AnimatePresence mode="popLayout">
        {visible.map((m) => {
          const p = map.project([m.lng, m.lat]);
          return (
            <motion.div
              key={m.id}
              className="absolute"
              style={{ left: p.x, top: p.y }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <div className="relative -translate-x-1/2 -translate-y-1/2">
                {/* pulsing halo */}
                <span
                  className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
                    animation: "indicatorPulse 2.6s ease-out infinite",
                  }}
                />
                <span
                  className="block h-2.5 w-2.5 rounded-full ring-2 ring-white/40"
                  style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
                />
                {/* label chip */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap">
                  <div className="glass-panel flex items-center gap-2 rounded-full px-2.5 py-1">
                    <span className="text-[11px] font-medium tracking-tight text-white/90">
                      {m.name}
                    </span>
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: accent }}
                    >
                      {m.score}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

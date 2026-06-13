"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import MapBackground from "@/components/MapBackground";
import MapMarkers from "@/components/MapMarkers";
import TopNav from "@/components/TopNav";
import ObservationDock from "@/components/ObservationDock";
import { ATMOSPHERIC, DECK_TABS, type DeckMode } from "@/lib/skyData";

export default function Home() {
  const [mode, setMode] = useState<DeckMode>("sunset");
  const accent = DECK_TABS.find((t) => t.mode === mode)!.accent;

  // cursor-driven parallax for the floating side panels (the map itself
  // stays interactive — drag / zoom — so it is not parallaxed)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const layerX = useTransform(sx, [-0.5, 0.5], [10, -10]);

  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <main ref={frame} className="relative h-full w-full overflow-hidden">
      {/* live interactive satellite map (markers projected onto it) */}
      <div className="absolute inset-0">
        <MapBackground mode={mode}>
          <MapMarkers mode={mode} />
        </MapBackground>
      </div>

      {/* foreground UI — pointer-events pass through empty areas to the map */}
      <div className="pointer-events-none relative flex h-full flex-col items-center px-6 pb-8 pt-6">
        <div className="pointer-events-auto">
          <TopNav />
        </div>

        <div className="flex-1" />

        <div className="pointer-events-auto">
          <ObservationDock mode={mode} onChange={setMode} />
        </div>
      </div>

      {/* map intelligence layers panel */}
      <motion.div
        style={{ x: layerX }}
        className="pointer-events-none absolute right-8 top-1/2 z-20 hidden -translate-y-1/2 lg:block"
      >
        <div className="fresnel glass-panel relative w-[232px] rounded-3xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
              Intelligence Layers
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.ul
              key={mode}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.4 }}
              className="space-y-2.5"
            >
              {ATMOSPHERIC[mode].layers.map((layer) => (
                <li
                  key={layer}
                  className="flex items-start gap-2 text-[12.5px] leading-snug text-white/75"
                >
                  <span
                    className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
                    style={{ background: accent }}
                  />
                  {layer}
                </li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* live mode badge */}
      <div className="absolute left-8 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
        <div className="fresnel glass-panel flex items-center gap-2 rounded-full px-3.5 py-2">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute h-2 w-2 rounded-full"
              style={{
                background: accent,
                animation: "indicatorPulse 2.4s ease-out infinite",
              }}
            />
            <span
              className="relative h-2 w-2 rounded-full"
              style={{ background: accent }}
            />
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
            Observation Mode
          </span>
        </div>
      </div>
    </main>
  );
}

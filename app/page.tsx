"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Map as MlMap } from "maplibre-gl";
import MapBackground from "@/components/MapBackground";
import MapMarkers from "@/components/MapMarkers";
import TopNav from "@/components/TopNav";
import ObservationDock from "@/components/ObservationDock";
import MarkerDetail from "@/components/MarkerDetail";
import BestPlaces from "@/components/BestPlaces";
import {
  ATMOSPHERIC,
  DECK_TABS,
  placesForMode,
  type DeckMode,
  type SkyMarker,
} from "@/lib/skyData";

export default function Home() {
  const [mode, setMode] = useState<DeckMode>("sunset");
  const [selected, setSelected] = useState<SkyMarker | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [map, setMap] = useState<MlMap | null>(null);

  const tab = DECK_TABS.find((t) => t.mode === mode)!;
  const accent = tab.accent;
  const places = placesForMode(mode);

  // switching observation mode swaps the visible markers, so any open detail
  // (anchored to a marker from the previous mode) should collapse.
  const changeMode = (m: DeckMode) => {
    setMode(m);
    setSelected(null);
    setHoveredId(null);
  };

  const flyToMarker = (m: SkyMarker) => {
    if (!map) return;
    map.flyTo({
      center: [m.lng, m.lat],
      zoom: Math.max(map.getZoom(), 12.6),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      duration: 1400,
      essential: true,
    });
  };

  // selecting from the list flies the camera; selecting on the map does not
  const selectFromList = (m: SkyMarker) => {
    setSelected(m);
    flyToMarker(m);
  };

  // clicking empty map area clears the current selection
  useEffect(() => {
    if (!map) return;
    const onClick = () => setSelected(null);
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map]);

  return (
    <main className="relative h-full w-full overflow-hidden">
      {/* live interactive satellite map — the primary canvas */}
      <div className="absolute inset-0">
        <MapBackground mode={mode} onMapReady={setMap}>
          <MapMarkers
            mode={mode}
            selectedId={selected?.id ?? null}
            hoveredId={hoveredId}
            onSelect={setSelected}
            onHover={setHoveredId}
          />
        </MapBackground>
      </div>

      {/* collapsible detail sidebar, opened by selecting a map marker */}
      <MarkerDetail marker={selected} onClose={() => setSelected(null)} />

      {/* ranked Best Places browser, synced with the map both ways */}
      <BestPlaces
        mode={mode}
        places={places}
        selectedId={selected?.id ?? null}
        hoveredId={hoveredId}
        onSelect={selectFromList}
        onHover={setHoveredId}
      />

      {/* foreground chrome — frames the map, center stays clear */}
      <div className="pointer-events-none relative flex h-full flex-col items-center px-4 pb-5 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
        <div className="pointer-events-auto w-full max-w-[700px]">
          <TopNav accent={accent} label={tab.label} />
        </div>

        <div className="flex-1" />

        <div className="pointer-events-auto flex flex-col items-center gap-2.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="fresnel glass-panel flex items-center gap-2 rounded-full px-3.5 py-1.5"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
              />
              <span className="text-[12px] font-medium tracking-tight text-white/80">
                {ATMOSPHERIC[mode].condition}
              </span>
            </motion.div>
          </AnimatePresence>

          <ObservationDock mode={mode} onChange={changeMode} />
        </div>
      </div>
    </main>
  );
}

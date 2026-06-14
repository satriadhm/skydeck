"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Map as MlMap } from "maplibre-gl";
import MapBackground from "@/components/MapBackground";
import MapMarkers from "@/components/MapMarkers";
import ConditionsField from "@/components/ConditionsField";
import TopNav from "@/components/TopNav";
import ObservationDock from "@/components/ObservationDock";
import MarkerDetail from "@/components/MarkerDetail";
import BestPlaces from "@/components/BestPlaces";
import { SkyDataProvider, useSkyData } from "@/components/SkyDataProvider";
import { DECK_TABS, type DeckMode, type SkyMarker } from "@/lib/skyData";

export default function Home() {
  return (
    <SkyDataProvider>
      <HomeContent />
    </SkyDataProvider>
  );
}

function HomeContent() {
  const sky = useSkyData();
  const [mode, setMode] = useState<DeckMode>("sunset");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [map, setMap] = useState<MlMap | null>(null);

  const tab = DECK_TABS.find((t) => t.mode === mode)!;
  const accent = tab.accent;
  const places = sky.placesForMode(mode);
  // resolve the live marker by id so an open detail refreshes with the feed
  const selected = selectedId
    ? sky.markers.find((m) => m.id === selectedId) ?? null
    : null;

  // switching observation mode swaps the visible markers, so any open detail
  // (anchored to a marker from the previous mode) should collapse.
  const changeMode = (m: DeckMode) => {
    setMode(m);
    setSelectedId(null);
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
    setSelectedId(m.id);
    flyToMarker(m);
  };

  // clicking empty map area clears the current selection
  useEffect(() => {
    if (!map) return;
    const onClick = () => setSelectedId(null);
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map]);

  const readout = sky.atmosphericFor(mode);

  return (
    <main className="relative h-full w-full overflow-hidden">
      {/* live interactive satellite map — the primary canvas */}
      <div className="absolute inset-0">
        <MapBackground mode={mode} onMapReady={setMap}>
          <ConditionsField field={sky.field} />
          <MapMarkers
            mode={mode}
            markers={sky.markers}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={(m) => setSelectedId(m.id)}
            onHover={setHoveredId}
          />
        </MapBackground>
      </div>

      {/* collapsible detail sidebar, opened by selecting a map marker */}
      <MarkerDetail marker={selected} onClose={() => setSelectedId(null)} />

      {/* ranked Best Places browser, synced with the map both ways */}
      <BestPlaces
        mode={mode}
        places={places}
        selectedId={selectedId}
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
              key={`${mode}-${readout.condition}`}
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
                {readout.condition}
              </span>
              <FeedTag status={sky.status} />
            </motion.div>
          </AnimatePresence>

          <ObservationDock mode={mode} onChange={changeMode} />
        </div>
      </div>
    </main>
  );
}

/** Tiny pill that shows whether conditions are live, sample, or loading. */
function FeedTag({ status }: { status: "loading" | "live" | "sample" }) {
  const meta = {
    loading: { label: "Syncing", color: "#9AA3B2" },
    live: { label: "Live", color: "#7DF9C1" },
    sample: { label: "Sample", color: "#9AA3B2" },
  }[status];

  return (
    <span className="ml-0.5 flex items-center gap-1 border-l border-white/15 pl-2">
      <span
        className="h-1 w-1 rounded-full"
        style={{
          background: meta.color,
          boxShadow: status === "live" ? `0 0 6px ${meta.color}` : "none",
          animation:
            status === "loading"
              ? "indicatorPulse 1.6s ease-out infinite"
              : undefined,
        }}
      />
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
    </span>
  );
}

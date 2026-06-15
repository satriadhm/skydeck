"use client";

import { useEffect, useRef, useState } from "react";
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
import SearchOverlay from "@/components/SearchOverlay";
import LocationWarning from "@/components/LocationWarning";
import DatePicker from "@/components/DatePicker";
import { isSameDay } from "@/lib/dateUtils";
import {
  DECK_TABS,
  MODE_CAMERA,
  type DeckMode,
  type SkyMarker,
} from "@/lib/skyData";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [geoWarningDismissed, setGeoWarningDismissed] = useState(false);
  // a cross-mode search pick: fly here once the new mode's reframe has run
  const pendingFly = useRef<SkyMarker | null>(null);

  const tab = DECK_TABS.find((t) => t.mode === mode)!;
  const accent = tab.accent;
  const places = sky.placesForMode(mode);
  // points the camera fits to for the active mode (near the current centre)
  const framePoints = sky.markers.filter((m) => m.mode === mode);
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

  // search pick: open the spot's detail and fly there, switching mode if needed
  const searchPick = (m: SkyMarker) => {
    setSearchOpen(false);
    setHoveredId(null);
    setSelectedId(m.id);
    if (m.mode !== mode) {
      // defer the fly until the mode's reframe (in MapBackground) has kicked off
      pendingFly.current = m;
      setMode(m.mode);
    } else {
      flyToMarker(m);
    }
  };

  // run the deferred cross-mode fly after the new mode has reframed
  useEffect(() => {
    const t = pendingFly.current;
    if (!t || !map || t.mode !== mode) return;
    pendingFly.current = null;
    map.flyTo({
      center: [t.lng, t.lat],
      zoom: Math.max(map.getZoom(), 12.6),
      bearing: MODE_CAMERA[t.mode].bearing,
      pitch: MODE_CAMERA[t.mode].pitch,
      duration: 1600,
      essential: true,
    });
  }, [mode, map]);

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
        <MapBackground
          mode={mode}
          center={sky.center}
          framePoints={framePoints}
          onMapReady={setMap}
        >
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
          <TopNav
            accent={accent}
            label={tab.label}
            location={sky.locationName}
            onSearch={() => setSearchOpen((v) => !v)}
          />
        </div>

        {/* minimalist day switcher — browse best spots across dates */}
        <div className="pointer-events-auto z-20 mt-2.5">
          <DatePicker date={sky.date} accent={accent} onChange={sky.setDate} />
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
              <FeedTag status={sky.status} date={sky.date} />
            </motion.div>
          </AnimatePresence>

          <ObservationDock mode={mode} onChange={changeMode} />
        </div>
      </div>

      {/* place search — opens from the nav search icon */}
      <SearchOverlay
        open={searchOpen}
        mode={mode}
        accent={accent}
        onClose={() => setSearchOpen(false)}
        onPick={searchPick}
        onLocation={(c, name) => {
          setSearchOpen(false);
          setSelectedId(null);
          sky.setLocation(c, name);
        }}
      />

      {/* warn when auto-locate failed; nudge toward manual search */}
      <LocationWarning
        open={sky.geoFailed && !geoWarningDismissed && !searchOpen}
        accent={accent}
        onSearch={() => {
          setGeoWarningDismissed(true);
          setSearchOpen(true);
        }}
        onDismiss={() => setGeoWarningDismissed(true)}
      />
    </main>
  );
}

/** Tiny pill: live now, forecast/archive for other days, or loading/sample. */
function FeedTag({
  status,
  date,
}: {
  status: "loading" | "live" | "sample";
  date: Date;
}) {
  const today = new Date();
  const meta =
    status === "loading"
      ? { label: "Syncing", color: "#9AA3B2", glow: false, pulse: true }
      : status === "sample"
        ? { label: "Sample", color: "#9AA3B2", glow: false, pulse: false }
        : isSameDay(date, today)
          ? { label: "Live", color: "#7DF9C1", glow: true, pulse: false }
          : date > today
            ? { label: "Forecast", color: "#9CE7FF", glow: true, pulse: false }
            : { label: "Archive", color: "#FFD76A", glow: true, pulse: false };

  return (
    <span className="ml-0.5 flex items-center gap-1 border-l border-white/15 pl-2">
      <span
        className="h-1 w-1 rounded-full"
        style={{
          background: meta.color,
          boxShadow: meta.glow ? `0 0 6px ${meta.color}` : "none",
          animation: meta.pulse ? "indicatorPulse 1.6s ease-out infinite" : undefined,
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

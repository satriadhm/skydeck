"use client";

import { useState } from "react";
import MapBackground from "@/components/MapBackground";
import MapMarkers from "@/components/MapMarkers";
import TopNav from "@/components/TopNav";
import ObservationDock from "@/components/ObservationDock";
import AtmosphericData from "@/components/AtmosphericData";
import MarkerDetail from "@/components/MarkerDetail";
import { DECK_TABS, type DeckMode, type SkyMarker } from "@/lib/skyData";

export default function Home() {
  const [mode, setMode] = useState<DeckMode>("sunset");
  const [selected, setSelected] = useState<SkyMarker | null>(null);
  const accent = DECK_TABS.find((t) => t.mode === mode)!.accent;

  // switching observation mode swaps the visible markers, so any open detail
  // (anchored to a marker from the previous mode) should collapse.
  const changeMode = (m: DeckMode) => {
    setMode(m);
    setSelected(null);
  };

  return (
    <main className="relative h-full w-full overflow-hidden">
      {/* live interactive satellite map (markers projected onto it) */}
      <div className="absolute inset-0">
        <MapBackground mode={mode}>
          <MapMarkers
            mode={mode}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </MapBackground>
      </div>

      {/* collapsible detail sidebar, opened by selecting a map marker */}
      <MarkerDetail marker={selected} onClose={() => setSelected(null)} />

      {/* foreground UI — pointer-events pass through empty areas to the map */}
      <div className="pointer-events-none relative flex h-full flex-col items-center px-4 pb-5 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
        <div className="pointer-events-auto w-full max-w-[700px]">
          <TopNav accent={accent} />
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <AtmosphericData mode={mode} />
        </div>

        <div className="pointer-events-auto">
          <ObservationDock mode={mode} onChange={changeMode} />
        </div>
      </div>
    </main>
  );
}

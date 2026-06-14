"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ATMOSPHERIC,
  DECK_TABS,
  MAP_CENTER,
  MARKERS,
  type AtmosphericReadout,
  type DeckMode,
  type SkyMarker,
  type StatusLevel,
} from "@/lib/skyData";
import {
  cloudLabel,
  clarityColor,
  conditionText,
  deriveScore,
  fetchLivePoints,
  humidityLabel,
  liveWindow,
  moonInfo,
  scoreToStatus,
  visibilityLabel,
  type LivePoint,
  type MoonInfo,
} from "@/lib/weather";
import {
  buildConditionsGrid,
  fetchNearbyPlaces,
  type DiscoveredPlace,
} from "@/lib/places";

/** How often to refresh the live feed while the app is open. */
const REFRESH_MS = 10 * 60 * 1000;

const ALL_MODES: DeckMode[] = ["sunrise", "sunset", "night"];

/** Static lattice of sample points for the live conditions field. */
const GRID = buildConditionsGrid(MAP_CENTER);

type FeedStatus = "loading" | "live" | "sample";

/** One dot in the live cloud-cover field behind the markers. */
export interface FieldPoint {
  id: string;
  lat: number;
  lng: number;
  /** cloud cover, % */
  cloudCover: number;
  /** colour, clear (teal) → overcast (grey) */
  color: string;
}

interface SkyData {
  /** every map marker: curated authored spots + live OSM-discovered places */
  markers: SkyMarker[];
  /** live conditions field (empty until/unless the feed loads) */
  field: FieldPoint[];
  /** is the data live, falling back to authored samples, or still loading */
  status: FeedStatus;
  /** when the live feed last succeeded */
  updatedAt: Date | null;
  /** how many real places were discovered nearby */
  discoveredCount: number;
  /** curated, ranked authored spots for the active mode (drives the list) */
  placesForMode: (mode: DeckMode) => SkyMarker[];
  /** mode-level atmospheric readout (from the mode's top-ranked curated spot) */
  atmosphericFor: (mode: DeckMode) => AtmosphericReadout;
  /** mode-level quality tier, for the dock tabs */
  statusForMode: (mode: DeckMode) => StatusLevel;
}

const SkyDataContext = createContext<SkyData | null>(null);

/** Merge one coordinate's live reading onto its authored marker. */
function enrichMarker(
  marker: SkyMarker,
  point: LivePoint,
  moon: MoonInfo,
): SkyMarker {
  const score = deriveScore(marker.mode, point, moon.illumination);
  const status = scoreToStatus(score);
  return {
    ...marker,
    score,
    status,
    bestWindow: liveWindow(marker.mode, point) || marker.bestWindow,
    metrics: {
      ...marker.metrics,
      cloudCover: cloudLabel(point.cloudCover),
      humidity: humidityLabel(point.humidity),
      visibility: visibilityLabel(point.visibilityM),
      moonPhase: moon.phase,
      condition: conditionText(marker.mode, status),
    },
  };
}

/** Build one marker per mode for a live-discovered OSM place. */
function discoveredMarkers(
  place: DiscoveredPlace,
  point: LivePoint,
  moon: MoonInfo,
): SkyMarker[] {
  const ele = place.elevationM
    ? `${Math.round(place.elevationM).toLocaleString()} m`
    : undefined;
  const kindLabel = place.kind[0].toUpperCase() + place.kind.slice(1);
  const tagline = ele ? `${kindLabel} · ${ele}` : `${kindLabel} near the caldera`;
  const sky = cloudLabel(point.cloudCover).toLowerCase();
  const vis = visibilityLabel(point.visibilityM).toLowerCase();

  return ALL_MODES.map((mode) => {
    const score = deriveScore(mode, point, moon.illumination);
    const status = scoreToStatus(score);
    const noun =
      mode === "night" ? "stargazing" : mode === "sunrise" ? "sunrise" : "sunset";
    return {
      id: `${place.id}-${mode}`,
      lng: place.lng,
      lat: place.lat,
      mode,
      name: place.name,
      status,
      score,
      discovered: true,
      kind: place.kind,
      tagline,
      whatToExpect:
        `A real ${place.kind} mapped near Bromo. Right now the sky reads ` +
        `${sky} with ${vis} visibility — a live candidate ${noun} vantage to scout.`,
      bestWindow: liveWindow(mode, point),
      elevation: ele,
      metrics: {
        cloudCover: cloudLabel(point.cloudCover),
        humidity: humidityLabel(point.humidity),
        visibility: visibilityLabel(point.visibilityM),
        moonPhase: moon.phase,
        condition: conditionText(mode, status),
      },
    } satisfies SkyMarker;
  });
}

export function SkyDataProvider({ children }: { children: React.ReactNode }) {
  const [markers, setMarkers] = useState<SkyMarker[]>(MARKERS);
  const [field, setField] = useState<FieldPoint[]>([]);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // once we've shown live data, keep it through a transient refresh failure
  const hasLive = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const markFallback = () => {
      if (hasLive.current) return;
      setMarkers(MARKERS);
      setField([]);
      setStatus("sample");
    };

    const load = async () => {
      try {
        // 1) real nearby places (optional — never fatal)
        let places: DiscoveredPlace[] = [];
        try {
          places = await fetchNearbyPlaces(MAP_CENTER, 28, 16, controller.signal);
        } catch {
          if (controller.signal.aborted) return;
          places = [];
        }
        if (cancelled) return;

        // 2) one batched weather call: authored + places + grid coords
        const authoredCoords = MARKERS.map((m) => ({ lng: m.lng, lat: m.lat }));
        const placeCoords = places.map((p) => ({ lng: p.lng, lat: p.lat }));
        const gridCoords = GRID.map((g) => ({ lng: g.lng, lat: g.lat }));
        const all = [...authoredCoords, ...placeCoords, ...gridCoords];

        const points = await fetchLivePoints(all, controller.signal);
        if (cancelled) return;
        if (points.length !== all.length) {
          markFallback();
          return;
        }

        const moon = moonInfo();
        const aEnd = MARKERS.length;
        const pEnd = aEnd + places.length;
        const authoredPts = points.slice(0, aEnd);
        const placePts = points.slice(aEnd, pEnd);
        const gridPts = points.slice(pEnd);

        const enrichedAuthored = MARKERS.map((m, i) =>
          enrichMarker(m, authoredPts[i], moon),
        );
        const enrichedDiscovered = places.flatMap((p, i) =>
          discoveredMarkers(p, placePts[i], moon),
        );
        const enrichedField: FieldPoint[] = GRID.map((g, i) => ({
          ...g,
          cloudCover: gridPts[i].cloudCover,
          color: clarityColor(gridPts[i].cloudCover),
        }));

        hasLive.current = true;
        setMarkers([...enrichedAuthored, ...enrichedDiscovered]);
        setField(enrichedField);
        setDiscoveredCount(places.length);
        setStatus("live");
        setUpdatedAt(new Date());
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        markFallback();
      }
    };

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  const value = useMemo<SkyData>(() => {
    // the curated ranked list is the authored set only; discovered places
    // enrich the map but don't crowd out the editorial ranking
    const placesForMode = (mode: DeckMode) =>
      markers
        .filter((m) => m.mode === mode && !m.discovered)
        .sort((a, b) => b.score - a.score);

    const topForMode = (mode: DeckMode) => placesForMode(mode)[0];

    const atmosphericFor = (mode: DeckMode): AtmosphericReadout => {
      const base = ATMOSPHERIC[mode];
      const top = topForMode(mode);
      if (!top?.metrics) return base;
      return {
        ...base,
        condition: top.metrics.condition ?? base.condition,
        cloudCover: top.metrics.cloudCover ?? base.cloudCover,
        humidity: top.metrics.humidity ?? base.humidity,
        moonPhase: top.metrics.moonPhase ?? base.moonPhase,
        visibility: top.metrics.visibility ?? base.visibility,
      };
    };

    const statusForMode = (mode: DeckMode): StatusLevel =>
      topForMode(mode)?.status ??
      DECK_TABS.find((t) => t.mode === mode)!.status;

    return {
      markers,
      field,
      status,
      updatedAt,
      discoveredCount,
      placesForMode,
      atmosphericFor,
      statusForMode,
    };
  }, [markers, field, status, updatedAt, discoveredCount]);

  return (
    <SkyDataContext.Provider value={value}>{children}</SkyDataContext.Provider>
  );
}

export function useSkyData(): SkyData {
  const ctx = useContext(SkyDataContext);
  if (!ctx) {
    throw new Error("useSkyData must be used within a SkyDataProvider");
  }
  return ctx;
}

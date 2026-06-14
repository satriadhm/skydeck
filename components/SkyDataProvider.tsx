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
  LOCATION_NAME,
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
  combinePlaces,
  fetchNearbyPlaces,
  kmBetween,
  reverseGeocode,
  FALLBACK_PLACES,
  type DiscoveredPlace,
} from "@/lib/places";

/** How often to refresh the live feed while the app is open. */
const REFRESH_MS = 10 * 60 * 1000;

const ALL_MODES: DeckMode[] = ["sunrise", "sunset", "night"];

/** Within this distance of home we include the curated spots + Bromo fallback. */
const HOME_RADIUS_KM = 60;

/** Ranked Best Places list cap. */
const LIST_CAP = 12;

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
  /** active map centre [lng, lat] */
  center: [number, number];
  /** human-readable name of the active region */
  locationName: string;
  /** recenter the whole feed on a new location (worldwide search) */
  setLocation: (center: [number, number], name: string) => void;
  /** ranked Best Places for the active mode (curated + discovered, capped) */
  placesForMode: (mode: DeckMode) => SkyMarker[];
  /** mode-level atmospheric readout (from the mode's top-ranked spot) */
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
      condition: conditionText(marker.mode),
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
    const fallbackWindow =
      mode === "sunrise"
        ? "Around first light"
        : mode === "sunset"
          ? "Around golden hour"
          : "After dark";
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
      bestWindow: liveWindow(mode, point) || fallbackWindow,
      elevation: ele,
      metrics: {
        cloudCover: cloudLabel(point.cloudCover),
        humidity: humidityLabel(point.humidity),
        visibility: visibilityLabel(point.visibilityM),
        moonPhase: moon.phase,
        condition: conditionText(mode),
      },
    } satisfies SkyMarker;
  });
}

/** Neutral reading used to seed markers before the live feed arrives. */
const SEED_POINT: LivePoint = {
  cloudCover: 35,
  cloudLow: 15,
  cloudMid: 20,
  cloudHigh: 25,
  humidity: 55,
  precip: 0,
  visibilityM: 16000,
  sunrise: "",
  sunset: "",
};

/**
 * Markers shown immediately on first paint — and retained as the offline
 * fallback — so the map is never sparse while (or if) the live feed is loading.
 * Bundled places keep stable ids, so when live data lands it refines them in
 * place rather than popping a new set of markers onto the map.
 */
const SEED_MARKERS: SkyMarker[] = (() => {
  const moon = moonInfo();
  return [
    ...MARKERS,
    ...FALLBACK_PLACES.flatMap((p) => discoveredMarkers(p, SEED_POINT, moon)),
  ];
})();

export function SkyDataProvider({ children }: { children: React.ReactNode }) {
  const [markers, setMarkers] = useState<SkyMarker[]>(SEED_MARKERS);
  const [field, setField] = useState<FieldPoint[]>([]);
  const [discoveredCount, setDiscoveredCount] = useState(FALLBACK_PLACES.length);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [center, setCenter] = useState<[number, number]>(MAP_CENTER);
  const [locationName, setLocationName] = useState<string>(LOCATION_NAME);
  // once we've shown live data, keep it through a transient refresh failure
  const hasLive = useRef(false);

  const setLocation = useMemo(
    () => (next: [number, number], name: string) => {
      hasLive.current = false;
      setStatus("loading");
      setLocationName(name);
      setCenter(next);
    },
    [],
  );

  // detect the user's location on first load and make it the default centre;
  // if permission is denied or unavailable we stay on the Bromo home default
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        let name = "Your location";
        try {
          name = (await reverseGeocode(c[0], c[1])) ?? name;
        } catch {
          /* keep the generic label */
        }
        if (!cancelled) setLocation(c, name);
      },
      () => {
        /* denied / unavailable — keep the home default */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const atHome = kmBetween(center, MAP_CENTER) < HOME_RADIUS_KM;
    // curated spots only belong to the home region
    const homeMarkers = atHome ? MARKERS : [];
    const grid = buildConditionsGrid(center);

    const markFallback = () => {
      if (hasLive.current) return; // keep the last good live data on a refresh blip
      if (atHome) {
        // seeded set (authored + bundled real places) keeps the map populated
        setMarkers(SEED_MARKERS);
        setField([]);
        setDiscoveredCount(FALLBACK_PLACES.length);
      }
      // away from home we simply keep whatever is currently shown
      setStatus("sample");
    };

    const load = async () => {
      try {
        // 1) real nearby places via Overpass (best-effort); combine with the
        //    bundled fallback only at home
        let fetched: DiscoveredPlace[] = [];
        try {
          fetched = await fetchNearbyPlaces(center, 30, 18, controller.signal);
        } catch {
          if (controller.signal.aborted) return;
          fetched = [];
        }
        if (cancelled) return;
        const places = combinePlaces(
          fetched,
          center,
          homeMarkers.map((m) => m.name),
          22,
          atHome,
        );

        // 2) one batched weather call: curated + places + grid coords
        const homeCoords = homeMarkers.map((m) => ({ lng: m.lng, lat: m.lat }));
        const placeCoords = places.map((p) => ({ lng: p.lng, lat: p.lat }));
        const gridCoords = grid.map((g) => ({ lng: g.lng, lat: g.lat }));
        const all = [...homeCoords, ...placeCoords, ...gridCoords];

        const points = await fetchLivePoints(all, controller.signal);
        if (cancelled) return;
        if (points.length !== all.length) {
          markFallback();
          return;
        }

        const moon = moonInfo();
        const aEnd = homeMarkers.length;
        const pEnd = aEnd + places.length;
        const homePts = points.slice(0, aEnd);
        const placePts = points.slice(aEnd, pEnd);
        const gridPts = points.slice(pEnd);

        const enrichedHome = homeMarkers.map((m, i) =>
          enrichMarker(m, homePts[i], moon),
        );
        const enrichedDiscovered = places.flatMap((p, i) =>
          discoveredMarkers(p, placePts[i], moon),
        );
        const enrichedField: FieldPoint[] = grid.map((g, i) => ({
          ...g,
          cloudCover: gridPts[i].cloudCover,
          color: clarityColor(gridPts[i].cloudCover),
        }));

        hasLive.current = true;
        setMarkers([...enrichedHome, ...enrichedDiscovered]);
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
  }, [center]);

  const value = useMemo<SkyData>(() => {
    // ranked Best Places: curated + discovered together, by live score, capped
    const placesForMode = (mode: DeckMode) =>
      markers
        .filter((m) => m.mode === mode)
        .sort((a, b) => b.score - a.score)
        .slice(0, LIST_CAP);

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
      center,
      locationName,
      setLocation,
      placesForMode,
      atmosphericFor,
      statusForMode,
    };
  }, [markers, field, status, updatedAt, discoveredCount, center, locationName, setLocation]);

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

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
  LOCATION_NAME,
  MAP_CENTER,
  type AtmosphericReadout,
  type DeckMode,
  type SkyMarker,
} from "@/lib/skyData";
import {
  cloudLabel,
  clarityColor,
  conditionText,
  deriveScore,
  fetchDayConditions,
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
  ipLocate,
  type DiscoveredPlace,
} from "@/lib/places";
import { isSameDay, startOfDay, toISODate } from "@/lib/dateUtils";

/** How often to refresh the live feed while the app is open. */
const REFRESH_MS = 10 * 60 * 1000;

const ALL_MODES: DeckMode[] = ["sunrise", "sunset", "night"];

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
  /** active map centre [lng, lat] */
  center: [number, number];
  /** human-readable name of the active region */
  locationName: string;
  /** recenter the whole feed on a new location (worldwide search) */
  setLocation: (center: [number, number], name: string) => void;
  /** the day the feed is showing (historical / today / forecast) */
  date: Date;
  /** switch the feed to another day */
  setDate: (d: Date) => void;
  /** ranked Best Places for the active mode (curated + discovered, capped) */
  placesForMode: (mode: DeckMode) => SkyMarker[];
  /** mode-level atmospheric readout (from the mode's top-ranked spot) */
  atmosphericFor: (mode: DeckMode) => AtmosphericReadout;
}

const SkyDataContext = createContext<SkyData | null>(null);

/** Build one marker per mode for a live-discovered OSM place. */
function discoveredMarkers(
  place: DiscoveredPlace,
  byMode: Record<DeckMode, LivePoint>,
  moon: MoonInfo,
): SkyMarker[] {
  const ele = place.elevationM
    ? `${Math.round(place.elevationM).toLocaleString()} m`
    : undefined;
  const kindLabel = place.kind[0].toUpperCase() + place.kind.slice(1);
  const tagline = ele ? `${kindLabel} · ${ele}` : kindLabel;

  return ALL_MODES.map((mode) => {
    const point = byMode[mode];
    const sky = cloudLabel(point.cloudCover);
    const vis = visibilityLabel(point.visibilityM).toLowerCase();
    const score = deriveScore(mode, point, moon.illumination);
    const status = scoreToStatus(score);
    const forWhat = mode === "night" ? "for stargazing" : `for the ${mode}`;
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
        `${kindLabel}${ele ? ` at ${ele}` : ""}. ${sky} skies and ` +
        `${vis} visibility ${forWhat}.`,
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

export function SkyDataProvider({ children }: { children: React.ReactNode }) {
  // no seeded markers: the map is empty until the live, location-based feed lands
  const [markers, setMarkers] = useState<SkyMarker[]>([]);
  const [field, setField] = useState<FieldPoint[]>([]);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [center, setCenter] = useState<[number, number]>(MAP_CENTER);
  const [locationName, setLocationName] = useState<string>(LOCATION_NAME);
  const [date, setDateState] = useState<Date>(() => startOfDay(new Date()));
  // once we've shown live data, keep it through a transient refresh failure
  const hasLive = useRef(false);

  const setLocation = useMemo(
    () => (next: [number, number], name: string) => {
      hasLive.current = false;
      setStatus("loading");
      setLocationName(name);
      // drop the previous region's markers/field so a new location never shows
      // stale spots under the new name; the live feed repopulates from `next`.
      setMarkers([]);
      setField([]);
      setCenter(next);
    },
    [],
  );

  const setDate = useMemo(
    () => (d: Date) => {
      hasLive.current = false;
      setStatus("loading");
      setDateState(startOfDay(d));
    },
    [],
  );

  // centre the map on the visitor's approximate location via a keyless IP lookup
  // (no prompt, works in in-app browsers); if it fails the neutral default holds
  useEffect(() => {
    let cancelled = false;
    ipLocate()
      .then((loc) => {
        if (!cancelled && loc) setLocation(loc.center, loc.name);
      })
      .catch(() => {
        /* keep the neutral default */
      });
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const grid = buildConditionsGrid(center);
    const viewingToday = isSameDay(date, new Date());
    // null = today/now (live current reading); otherwise a specific date
    const dateISO = viewingToday ? null : toISODate(date);
    // moon phase for the selected day (noon, to avoid tz edges)
    const moon = moonInfo(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));

    const markFallback = () => {
      // keep the last good live data through a transient refresh blip; otherwise
      // the map stays empty (with a "Sample" tag) until the feed recovers
      if (hasLive.current) return;
      setStatus("sample");
    };

    // a single anchor at the centre so the location is never left empty while
    // (or if) Overpass discovery comes back with nothing
    const anchor: DiscoveredPlace = {
      id: `here-${center[0].toFixed(3)},${center[1].toFixed(3)}`,
      name: locationName || "Your location",
      lat: center[1],
      lng: center[0],
      kind: "viewpoint",
    };

    const load = async () => {
      // Two independent results, composed as each lands so arrival order doesn't
      // matter. The base phase (conditions field + the location anchor) doesn't
      // touch Overpass, so it goes Live fast; discovery folds its spots in after.
      let baseReady = false;
      let enrichedAnchor: SkyMarker[] = [];
      let enrichedDiscovered: SkyMarker[] | null = null; // null = still discovering

      const compose = () => {
        if (cancelled || !baseReady) return;
        const discovered = enrichedDiscovered ?? [];
        // once real spots arrive the placeholder anchor is dropped
        setMarkers(discovered.length > 0 ? discovered : enrichedAnchor);
      };

      // ---- Phase 1: base feed — conditions field + location anchor ---------
      const basePhase = async () => {
        const gridCoords = grid.map((g) => ({ lng: g.lng, lat: g.lat }));
        const all = [...gridCoords, { lng: anchor.lng, lat: anchor.lat }];

        const conditions = await fetchDayConditions(all, dateISO, controller.signal);
        if (cancelled) return;
        if (conditions.length !== all.length) {
          markFallback();
          return;
        }

        const gridC = conditions.slice(0, grid.length);
        const anchorC = conditions[grid.length];

        enrichedAnchor = discoveredMarkers(anchor, anchorC.byMode, moon);
        const enrichedField: FieldPoint[] = grid.map((g, i) => ({
          ...g,
          cloudCover: gridC[i].fieldCloud,
          color: clarityColor(gridC[i].fieldCloud),
        }));

        hasLive.current = true;
        baseReady = true;
        setField(enrichedField);
        setStatus("live");
        compose();
      };

      // ---- Phase 2: discovered spots via Overpass — folded in when ready ---
      const discoverPhase = async () => {
        let fetched: DiscoveredPlace[] = [];
        try {
          fetched = await fetchNearbyPlaces(center, 45, 24, controller.signal);
        } catch {
          if (controller.signal.aborted) return;
          fetched = [];
        }
        if (cancelled) return;
        const places = combinePlaces(fetched, center, [], 22);
        if (places.length === 0) {
          enrichedDiscovered = []; // discovery done, nothing found — keep anchor
          compose();
          return;
        }

        const conditions = await fetchDayConditions(
          places.map((p) => ({ lng: p.lng, lat: p.lat })),
          dateISO,
          controller.signal,
        );
        if (cancelled) return;
        if (conditions.length !== places.length) return;

        enrichedDiscovered = places.flatMap((p, i) =>
          discoveredMarkers(p, conditions[i].byMode, moon),
        );
        compose();
      };

      try {
        await Promise.all([basePhase(), discoverPhase()]);
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        markFallback();
      }
    };

    load();
    // only "today" changes over time; historical/forecast days are fixed
    const id = viewingToday ? setInterval(load, REFRESH_MS) : undefined;
    return () => {
      cancelled = true;
      controller.abort();
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, date]);

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

    return {
      markers,
      field,
      status,
      center,
      locationName,
      setLocation,
      date,
      setDate,
      placesForMode,
      atmosphericFor,
    };
  }, [markers, field, status, center, locationName, setLocation, date, setDate]);

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

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
import { loadPrefs, savePrefs } from "@/lib/persist";
import { reportError, reportEvent } from "@/lib/telemetry";

/** Placeholder reading for the instant, weatherless anchor (before base weather). */
const NEUTRAL_POINT: LivePoint = {
  cloudCover: 0,
  cloudLow: 0,
  cloudMid: 0,
  cloudHigh: 0,
  humidity: 0,
  precip: 0,
  visibilityM: 0,
  sunrise: "",
  sunset: "",
};

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
  /** true when auto-locate failed, so the app sits on the neutral default */
  geoFailed: boolean;
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
  // true when auto-locate failed and we're parked on the neutral default
  const [geoFailed, setGeoFailed] = useState(false);
  // once we've shown live data, keep it through a transient refresh failure
  const hasLive = useRef(false);

  const setLocation = useMemo(
    () => (next: [number, number], name: string) => {
      hasLive.current = false;
      setGeoFailed(false); // a chosen/known location clears the warning
      setStatus("loading");
      setLocationName(name);
      // drop the previous region's markers/field so a new location never shows
      // stale spots under the new name; the live feed repopulates from `next`.
      setMarkers([]);
      setField([]);
      setCenter(next);
      // remember it so a return visit skips the cold start
      savePrefs({ center: next, name });
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

  // On load, restore the last location instantly if we have one (returning
  // visitor — never lands on the mid-ocean neutral center). Otherwise centre on
  // the visitor's approximate location via a keyless IP lookup (no prompt, works
  // in in-app browsers); if that fails the neutral default holds.
  useEffect(() => {
    let cancelled = false;
    const stored = loadPrefs();
    if (stored) {
      setLocation(stored.center, stored.name);
      return () => {
        cancelled = true;
      };
    }
    ipLocate()
      .then((loc) => {
        if (cancelled) return;
        if (loc) setLocation(loc.center, loc.name);
        else setGeoFailed(true); // couldn't resolve — warn and let them search
      })
      .catch((err) => {
        if (!cancelled) {
          reportError("ip_locate", err);
          setGeoFailed(true);
        }
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

    // Two fully independent phases so a base-weather failure can't hide spots
    // that loaded fine (and vice-versa). Each composes as it lands; `compose`
    // renders discovered spots when present, else the anchor.
    let anchorMarkers: SkyMarker[] | null = null;
    let discovered: SkyMarker[] | null = null; // null = still discovering

    const compose = () => {
      if (cancelled) return;
      const spots =
        discovered && discovered.length > 0 ? discovered : anchorMarkers ?? [];
      setMarkers(spots);
    };

    // show a weatherless anchor immediately so the location is never empty while
    // the feeds load; base weather upgrades it in place a moment later
    anchorMarkers = discoveredMarkers(
      anchor,
      { sunrise: NEUTRAL_POINT, sunset: NEUTRAL_POINT, night: NEUTRAL_POINT },
      moon,
    );
    compose();

    // ---- Phase 1: base feed — conditions field + location anchor ---------
    const basePhase = async () => {
      const gridCoords = grid.map((g) => ({ lng: g.lng, lat: g.lat }));
      const all = [...gridCoords, { lng: anchor.lng, lat: anchor.lat }];
      try {
        const conditions = await fetchDayConditions(all, dateISO, controller.signal);
        if (cancelled) return;
        if (conditions.length !== all.length) {
          throw new Error("base weather length mismatch");
        }

        const gridC = conditions.slice(0, grid.length);
        const anchorC = conditions[grid.length];

        anchorMarkers = discoveredMarkers(anchor, anchorC.byMode, moon);
        const enrichedField: FieldPoint[] = grid.map((g, i) => ({
          ...g,
          cloudCover: gridC[i].fieldCloud,
          color: clarityColor(gridC[i].fieldCloud),
        }));

        hasLive.current = true;
        setField(enrichedField);
        setStatus("live");
        compose();
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        // a base failure must never block discovery — just log and fall back
        reportError("weather_base", err);
        markFallback();
      }
    };

    // keep already-shown spots through a transient failure on a refresh tick,
    // rather than clobbering them back to the bare anchor
    const hadSpots = () => discovered !== null && discovered.length > 0;

    // ---- Phase 2: discovered spots via Overpass — folded in when ready ---
    const discoverPhase = async () => {
      let fetched: DiscoveredPlace[];
      try {
        fetched = await fetchNearbyPlaces(center, 45, 24, controller.signal);
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        reportError("discovery", err);
        if (!hadSpots()) discovered = []; // fall back to the anchor
        compose();
        return;
      }
      if (cancelled) return;

      const places = combinePlaces(fetched, center, 22);
      if (places.length === 0) {
        // a legitimate "nothing here", not a failure — stays Live, keeps anchor
        reportEvent("discovery_empty", {
          center: `${center[0].toFixed(2)},${center[1].toFixed(2)}`,
        });
        if (!hadSpots()) discovered = [];
        compose();
        return;
      }

      try {
        const conditions = await fetchDayConditions(
          places.map((p) => ({ lng: p.lng, lat: p.lat })),
          dateISO,
          controller.signal,
        );
        if (cancelled) return;
        if (conditions.length !== places.length) {
          throw new Error("discovered weather length mismatch");
        }
        discovered = places.flatMap((p, i) =>
          discoveredMarkers(p, conditions[i].byMode, moon),
        );
        hasLive.current = true;
        setStatus("live");
        compose();
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        reportError("weather_discovered", err);
        if (!hadSpots()) discovered = []; // fall back rather than staying null
        compose();
      }
    };

    const load = async () => {
      await Promise.all([basePhase(), discoverPhase()]);
      if (cancelled || controller.signal.aborted) return;
      // only when BOTH phases failed to produce any live data do we go Sample
      if (!hasLive.current) markFallback();
    };

    // guard against overlapping refresh ticks: skip a new run while one is live
    let inFlight = false;
    const runLoad = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        await load();
      } finally {
        inFlight = false;
      }
    };

    runLoad();
    // only "today" changes over time; historical/forecast days are fixed
    const id = viewingToday ? setInterval(runLoad, REFRESH_MS) : undefined;
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
      geoFailed,
      setLocation,
      date,
      setDate,
      placesForMode,
      atmosphericFor,
    };
  }, [markers, field, status, center, locationName, geoFailed, setLocation, date, setDate]);

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

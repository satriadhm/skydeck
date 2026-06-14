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
  MARKERS,
  type AtmosphericReadout,
  type DeckMode,
  type SkyMarker,
  type StatusLevel,
} from "@/lib/skyData";
import {
  cloudLabel,
  conditionText,
  deriveScore,
  fetchLivePoints,
  humidityLabel,
  liveWindow,
  moonInfo,
  scoreToStatus,
  visibilityLabel,
  type LivePoint,
} from "@/lib/weather";

/** How often to refresh the live feed while the app is open. */
const REFRESH_MS = 10 * 60 * 1000;

type FeedStatus = "loading" | "live" | "sample";

interface SkyData {
  /** authored markers, enriched with live conditions when available */
  markers: SkyMarker[];
  /** is the data live, falling back to authored samples, or still loading */
  status: FeedStatus;
  /** when the live feed last succeeded */
  updatedAt: Date | null;
  /** active-mode markers, ranked best-first */
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
  moonIllumination: number,
  moonPhase: string,
): SkyMarker {
  const score = deriveScore(marker.mode, point, moonIllumination);
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
      moonPhase,
      condition: conditionText(marker.mode, status),
    },
  };
}

export function SkyDataProvider({ children }: { children: React.ReactNode }) {
  const [markers, setMarkers] = useState<SkyMarker[]>(MARKERS);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // keep the authored set around so a later failure can revert cleanly
  const hasLive = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const points = await fetchLivePoints(
          MARKERS.map((m) => ({ lng: m.lng, lat: m.lat })),
          controller.signal,
        );
        if (cancelled || points.length !== MARKERS.length) {
          if (!cancelled) markFallback();
          return;
        }
        const moon = moonInfo();
        const enriched = MARKERS.map((m, i) =>
          enrichMarker(m, points[i], moon.illumination, moon.phase),
        );
        if (cancelled) return;
        hasLive.current = true;
        setMarkers(enriched);
        setStatus("live");
        setUpdatedAt(new Date());
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        markFallback();
      }
    };

    // if live data never arrives, fall back to the authored samples
    const markFallback = () => {
      if (hasLive.current) return; // keep the last good live data on a refresh blip
      setMarkers(MARKERS);
      setStatus("sample");
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
    const placesForMode = (mode: DeckMode) =>
      markers
        .filter((m) => m.mode === mode)
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
      status,
      updatedAt,
      placesForMode,
      atmosphericFor,
      statusForMode,
    };
  }, [markers, status, updatedAt]);

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

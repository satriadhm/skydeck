"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import maplibregl, { type Map as MlMap, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_CENTER, MAP_ZOOM, MODE_CAMERA, type DeckMode } from "@/lib/skyData";
import { MapContext } from "./MapContext";

/** Per-mode cinematic color grade applied over the satellite terrain. */
const MODE_GRADE: Record<
  DeckMode,
  { haze: string; horizon: string; tint: string; vignette: string }
> = {
  sunrise: {
    haze: "rgba(255, 196, 120, 0.18)",
    horizon: "rgba(255, 183, 92, 0.32)",
    tint: "rgba(46, 32, 18, 0.26)",
    vignette: "rgba(5, 6, 12, 0.72)",
  },
  sunset: {
    haze: "rgba(255, 120, 110, 0.20)",
    horizon: "rgba(255, 95, 140, 0.34)",
    tint: "rgba(48, 22, 30, 0.26)",
    vignette: "rgba(7, 4, 10, 0.74)",
  },
  night: {
    haze: "rgba(110, 140, 255, 0.16)",
    horizon: "rgba(90, 120, 255, 0.24)",
    tint: "rgba(10, 16, 40, 0.40)",
    vignette: "rgba(2, 4, 12, 0.82)",
  },
};

/**
 * Real dark satellite basemap. Esri World Imagery raster tiles (free for
 * development use, no API token), desaturated and darkened in-shader for the
 * cinematic premium grade.
 */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [
    { id: "void", type: "background", paint: { "background-color": "#05070d" } },
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
      paint: {
        "raster-saturation": -0.4,
        "raster-brightness-min": 0.02,
        "raster-brightness-max": 0.92,
        "raster-contrast": 0.05,
      },
    },
  ],
};

export default function MapBackground({
  mode,
  center = MAP_CENTER,
  framePoints,
  children,
  onMapReady,
}: {
  mode: DeckMode;
  /** active map centre [lng, lat]; changing it reframes to the new region */
  center?: [number, number];
  /** active-mode points to fit the camera to (near `center`) */
  framePoints?: { lng: number; lat: number }[];
  children?: React.ReactNode;
  /** receives the map instance for page-level camera control + events */
  onMapReady?: (map: MlMap | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [map, setMap] = useState<MlMap | null>(null);
  const grade = MODE_GRADE[mode];
  // read latest points without making the reframe effect depend on their identity
  const framePointsRef = useRef(framePoints);
  framePointsRef.current = framePoints;
  const centerKey = `${center[0]},${center[1]}`;
  const lastCenterKey = useRef(centerKey);

  // initialise the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const cam = MODE_CAMERA[mode];
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      bearing: cam.bearing,
      pitch: cam.pitch,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      maxPitch: 60,
      logoPosition: "bottom-left",
      // allow the WebGL canvas to be captured by screenshot tooling
      preserveDrawingBuffer: true,
    });

    m.on("load", () => {
      mapRef.current = m;
      m.resize();
      setMap(m);
      onMapReady?.(m);
    });

    // one-shot safeguard: re-measure once layout has settled
    const t = window.setTimeout(() => m.resize(), 400);

    return () => {
      window.clearTimeout(t);
      m.remove();
      mapRef.current = null;
      setMap(null);
      onMapReady?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cinematic reframe on mode change or new location — fit the camera to the
  // active mode's spots near the current centre (preserving per-mode
  // bearing/pitch), so switching modes or searching a place takes you there.
  useEffect(() => {
    if (!map) return;
    const cam = MODE_CAMERA[mode];

    // a location change (worldwide search) flies straight to the new centre —
    // we ignore the still-stale points from the previous region here
    if (lastCenterKey.current !== centerKey) {
      lastCenterKey.current = centerKey;
      map.flyTo({
        center,
        zoom: cam.zoom,
        bearing: cam.bearing,
        pitch: cam.pitch,
        duration: 2600,
        curve: 1.5,
        essential: true,
      });
      return;
    }

    const pts = framePointsRef.current ?? [];

    if (pts.length > 0) {
      const bounds = new maplibregl.LngLatBounds(
        [pts[0].lng, pts[0].lat],
        [pts[0].lng, pts[0].lat],
      );
      for (const p of pts) bounds.extend([p.lng, p.lat]);
      map.fitBounds(bounds, {
        bearing: cam.bearing,
        pitch: cam.pitch,
        padding: 120,
        maxZoom: 12.4,
        duration: 2200,
        curve: 1.4,
        essential: true,
      });
    } else {
      map.flyTo({
        center,
        zoom: cam.zoom,
        bearing: cam.bearing,
        pitch: cam.pitch,
        duration: 2200,
        curve: 1.4,
        essential: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mode, centerKey]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05070d]">
      {/* live MapLibre canvas */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full sky-map" />

      {/* ---- Atmospheric overlays (mode-graded), above the map ---------- */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: `radial-gradient(120% 80% at 50% 16%, ${grade.horizon} 0%, transparent 55%)`,
          }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0"
          animate={{ backgroundColor: grade.tint }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
          style={{ mixBlendMode: "color" }}
        />
        <motion.div
          className="absolute inset-0"
          animate={{
            background: `radial-gradient(100% 60% at 50% 28%, ${grade.haze} 0%, transparent 70%)`,
          }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
          style={{ mixBlendMode: "screen" }}
        />

        {/* night starfield, layered above the darkened map */}
        {mode === "night" && (
          <div className="absolute inset-0">
            {STAR_FIELD.map((s, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: s.r,
                  height: s.r,
                  opacity: 0.2,
                  animation: `twinkle ${s.d}s ease-in-out ${s.delay}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {/* cinematic vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(130% 130% at 50% 42%, transparent 52%, ${grade.vignette} 100%)`,
          }}
        />
        <div className="noise-overlay" />
      </div>

      {/* geo-anchored overlays (markers) share the live map instance */}
      <MapContext.Provider value={map}>{children}</MapContext.Provider>
    </div>
  );
}

/* Deterministic pseudo-random star positions (stable across renders). */
const STAR_FIELD = Array.from({ length: 48 }).map((_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.123;
  const c = Math.sin(i * 3.123) * 9931.77;
  const frac = (n: number) => n - Math.floor(n);
  return {
    x: frac(a) * 100,
    y: frac(b) * 58,
    r: 1 + frac(c) * 1.6,
    d: 2.4 + frac(a) * 3.2,
    delay: frac(b) * 4,
  };
});

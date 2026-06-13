# Sky Deck — Floating Glass Observation Dock

A map-first concept UI for browsing sunrise, sunset, and night-sky viewing spots. The
interface is a floating glass dock over a fullscreen satellite map, with per-mode camera
moves and color grading.

> Note: the sky scores, location names, and atmospheric metrics are illustrative sample
> data, not a live forecast feed.

## Stack

- **Next.js 14** (App Router) · **React 18** · **TypeScript**
- **Tailwind CSS** for the design system
- **Framer Motion** for spring-based, GPU-accelerated motion
- **MapLibre GL** rendering **real Esri World Imagery** satellite tiles
  (no API token required), desaturated and darkened in-shader

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

## Experience

- **Fullscreen real satellite map** — a live, interactive MapLibre map showing genuine
  Esri World Imagery over Lake Wakatipu / Queenstown, New Zealand (mountain ranges, a
  glacial lake, forested valleys). Desaturated and darkened in-shader, then layered with
  mode-driven color grading, atmospheric haze, vignette, and a film-grain overlay.
  Drag to pan, scroll to zoom.
- **Floating glass top nav** — 700×68 blurred glass pill with a Fresnel edge highlight.
- **Hero atmospheric readout** — huge sky-quality score plus Cloud Cover, Humidity,
  Moon Phase, and Visibility cards. All values animate on mode change.
- **Observation Dock** — the centerpiece. 620×104 glassmorphic console with three modes:

  | Mode       | Theme          | Score | Status      |
  | ---------- | -------------- | ----- | ----------- |
  | Sunrise    | Warm gold      | 92    | Exceptional |
  | Sunset     | Golden hour    | 88    | Excellent (default) |
  | Night Deck | Cosmic blue    | 74    | Good        |

  Active tab springs up (`scale 1.03`, `translateY -4px`), brightens, and casts a themed
  glow. Hover lifts to `1.015`. Status dots pulse/glow per level.
- **Observation-mode shifts** — switching modes flies the camera (east-facing for
  sunrise, west for sunset, top-down survey for night), recolors the whole map, swaps the
  geo-anchored location markers (which stay pinned to real coordinates as you pan/zoom),
  and refreshes the Map Layers panel.

## Structure

```
app/
  layout.tsx          # Inter Tight font, metadata
  globals.css         # glass primitives, keyframes, Fresnel/streak/noise utilities
  page.tsx            # state, cursor parallax, layout composition
components/
  MapBackground.tsx   # satellite map + per-mode atmospheric grading + starfield
  MapMarkers.tsx      # geo-anchored location markers, filtered by mode
  TopNav.tsx          # floating glass navigation pill
  AtmosphericData.tsx # hero score + metric cards
  ObservationDock.tsx # the floating glass dock + tab sections
  StatusIndicator.tsx # status dots (pulse/glow/subtle per level)
lib/
  skyData.ts          # modes, palettes, scores, metrics, markers
```

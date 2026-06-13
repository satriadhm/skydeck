# Sky Deck

A concept UI for browsing sunrise, sunset, and night-sky viewing spots. The interface is a
floating glass dock over a fullscreen satellite map; switching modes moves the camera,
recolors the map, and swaps the visible viewing locations.

All location names, viewing conditions, and atmospheric metrics are sample data, not a live
forecast feed.

## Stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS
- Framer Motion for transitions
- MapLibre GL rendering Esri World Imagery satellite tiles (no API token required),
  desaturated and darkened via raster paint properties

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

## How it works

The map opens on Lake Wakatipu / Queenstown, New Zealand. The bottom dock has three modes,
and selecting one drives the rest of the UI:

| Mode       | Theme       | Status      |
| ---------- | ----------- | ----------- |
| Sunrise    | Warm gold   | Exceptional |
| Sunset     | Golden hour | Excellent (default) |
| Night Deck | Cosmic blue | Good        |

Changing mode:

- **Moves the camera** — `flyTo` faces east for sunrise, west for sunset, and top-down for
  night (see `MODE_CAMERA` in `lib/skyData.ts`).
- **Recolors the map** — a per-mode color grade (haze, horizon glow, tint, vignette) is
  layered over the satellite tiles; night mode adds a starfield.
- **Swaps the markers** — each viewing location belongs to a mode and is shown only in that
  mode. Markers stay pinned to real coordinates as you pan and zoom.
- **Updates the side panels** — the hero illustration, qualitative metric cards (Cloud
  Cover, Humidity, Moon Phase, Visibility), and the Map Layers list all change.

Other interactions:

- Drag to pan, scroll to zoom.
- Click a marker to open a detail sidebar (`MarkerDetail`) with its name, coordinates,
  conditions, and relevant map layers.
- The hero shows an illustrated SVG sky scene (`SkyScene`) per mode rather than a numeric
  score; the metric cards are qualitative on purpose ("Light", "Crisp", "Far").

## Structure

```
app/
  layout.tsx          # Inter Tight font, page metadata
  globals.css         # glass primitives, keyframes, utilities
  page.tsx            # mode state, cursor parallax, layout composition
components/
  MapBackground.tsx   # MapLibre satellite map + per-mode color grade + starfield
  MapContext.tsx      # shares the map instance with marker overlays
  MapMarkers.tsx      # geo-anchored markers, filtered by mode
  MarkerDetail.tsx    # collapsible sidebar for a selected marker
  TopNav.tsx          # top navigation bar
  AtmosphericData.tsx # hero sky scene + metric cards
  SkyScene.tsx        # per-mode SVG sky illustration
  ObservationDock.tsx # mode switcher (the three tabs)
  StatusIndicator.tsx # status dot + label
lib/
  skyData.ts          # modes, palettes, camera moves, metrics, markers
```

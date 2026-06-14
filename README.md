# Sky Deck

A map-first concept UI for browsing sunrise, sunset, and night-sky viewing spots. A
fullscreen satellite map is the primary canvas; glass chrome (nav, mode dock, ranked
list, detail sidebar) frames it. Switching modes reframes the camera onto that mode's
spots, recolors the map, and swaps the visible viewing locations.

The curated spots' names, vantage prose, and access notes are authored editorial
content. Everything atmospheric is **live**:

- **Conditions** — each spot's cloud cover, humidity, visibility, and today's
  sunrise/sunset are pulled per-coordinate from [Open-Meteo](https://open-meteo.com)
  (free, keyless, CORS-enabled — no token, matching the map tiles). Quality tier,
  score and ranking are derived from them; moon phase is computed locally.
- **Real nearby places** — viewpoints, peaks and volcanoes around the caldera are
  discovered live from OpenStreetMap via the [Overpass API](https://overpass-api.de)
  (keyless) and dropped on the map as lighter, clickable points, each scored by the
  same live feed. The curated "Best Places" list stays editorial; the map fills with
  the discovered points.
- **Conditions field** — a faint lattice of dots over the region, each coloured by
  live cloud cover (clear → teal, overcast → grey), showing where the sky is clearest
  right now.
- **Spot photos** — selecting a marker pulls a real nearby photograph from
  [Wikimedia Commons](https://commons.wikimedia.org) (keyless, CC-attributed) for the
  detail panel, falling back to the illustrated SkyScene when none is found. See
  `lib/photos.ts` and `components/PlacePhoto.tsx`.
- **Worldwide search** — the nav search resolves any city/region via keyless
  [Nominatim](https://nominatim.openstreetmap.org) geocoding; picking a result
  recenters the map and refetches live places + weather + the conditions grid there.
  Bromo is the home/default; the curated spots belong to the home region.

### How "Best Places" is ranked

Each spot gets a live 0–100 score from `deriveScore` (`lib/weather.ts`), and the list
ranks curated + discovered spots together (top 12):

- **Sunrise / Sunset** weight a clear **horizon** (low cloud is the enemy), a *moderate*
  amount of **mid/high cloud** that catches colour, and visibility. Rain penalises.
- **Night** weights a clear, **dark (new-moon)** sky and visibility.

Because the inputs are live, the ranking reorders as conditions change.

If a feed is unreachable the UI falls back to authored sample data, and a Live /
Sample tag by the condition readout shows which is in play.

## Stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS
- Framer Motion for transitions
- MapLibre GL rendering Esri World Imagery satellite tiles (no API token required),
  desaturated and darkened via raster paint properties
- Open-Meteo for live per-coordinate conditions and sun times (keyless), with moon
  phase computed locally; see `lib/weather.ts` and `components/SkyDataProvider.tsx`
- Overpass API (OpenStreetMap) for live nearby viewpoints/peaks/volcanoes and a
  cloud-cover conditions field; see `lib/places.ts` and `components/ConditionsField.tsx`

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

## How it works

The map opens on the Bromo–Tengger–Semeru caldera, East Java, Indonesia. The bottom dock has three modes,
and selecting one drives the rest of the UI:

| Mode       | Theme       | Status      |
| ---------- | ----------- | ----------- |
| Sunrise    | Warm gold   | Exceptional |
| Sunset     | Golden hour | Excellent (default) |
| Night Deck | Cosmic blue | Good        |

Changing mode:

- **Reframes the camera** — `fitBounds` frames the active mode's markers, keeping the
  per-mode bearing/pitch (east for sunrise, west for sunset, top-down for night; see
  `MODE_CAMERA` in `lib/skyData.ts`).
- **Recolors the map** — a per-mode color grade (haze, horizon glow, tint, vignette) is
  layered over the satellite tiles; night mode adds a starfield.
- **Swaps the markers** — each viewing location belongs to a mode and is shown only in that
  mode. Markers stay pinned to real coordinates as you pan and zoom.
- **Re-ranks the Best Places list** and updates the nav's sky-scene thumbnail and the
  condition chip by the dock.

Other interactions:

- Drag to pan, scroll to zoom. Click empty map area to deselect.
- **Best Places** (`BestPlaces`) — a ranked, score-driven list of the active mode's spots
  (right panel on desktop, collapsible sheet on mobile). Click a row to fly there and open
  its detail; hovering a row or marker emphasizes the other. Selecting a marker on the map
  highlights its row.
- **Detail sidebar** (`MarkerDetail`) — per-place content: a "what to expect in the sky"
  description, best viewing window, facing/elevation/access, and conditions. Spot-level
  fields fall back to the mode default only where a spot does not override them.
- The per-mode SVG sky scene (`SkyScene`) lives as a compact live thumbnail in the nav and
  in the detail sidebar; metric values are qualitative on purpose ("Light", "Crisp", "Far").

## Structure

```
app/
  layout.tsx          # Inter Tight font, page metadata
  globals.css         # glass primitives, keyframes, utilities
  page.tsx            # mode/selection/hover state, map wiring, layout composition
components/
  MapBackground.tsx   # MapLibre satellite map + per-mode color grade + fit-to-bounds
  MapContext.tsx      # shares the map instance with marker overlays
  MapMarkers.tsx      # geo-anchored markers, filtered by mode, hover/selection sync
  MarkerDetail.tsx    # collapsible sidebar with per-place content
  BestPlaces.tsx      # ranked list of the active mode's spots, synced with the map
  TopNav.tsx          # top nav bar with the live sky-scene thumbnail
  SkyScene.tsx        # per-mode SVG sky illustration
  ObservationDock.tsx # mode switcher (the three tabs)
  StatusIndicator.tsx # status dot + label
lib/
  skyData.ts          # modes, palettes, camera moves, markers + per-place content
```

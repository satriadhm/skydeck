# Sky Deck

A map-first concept UI for browsing sunrise, sunset, and night-sky viewing spots
**around wherever you are**. A fullscreen satellite map is the primary canvas;
glass chrome (nav, mode dock, ranked list, detail sidebar) frames it. Switching
modes reframes the camera, recolors the map, and swaps the visible viewing
locations.

Sky Deck is **fully location-based** — there's no curated or bundled content. On
load it centers on your approximate location and fills the map entirely from live
open data:

- **Real nearby spots** — viewpoints, peaks, volcanoes, hills, saddles, beaches,
  capes, clifftops and observation towers around you are discovered live from
  OpenStreetMap via the [Overpass API](https://overpass-api.de) (keyless),
  dropped on the map as clickable points and ranked by the live feed. Unnamed
  features (common in cities) are kept and labelled by kind, so flat/urban areas
  still surface spots. If discovery finds nothing nearby, a single anchor at your
  location keeps the map from being empty.
- **Conditions** — each spot's cloud cover, humidity, visibility, and today's
  sunrise/sunset are pulled per-coordinate from [Open-Meteo](https://open-meteo.com)
  (free, keyless, CORS-enabled — no token, matching the map tiles). Quality tier,
  score and ranking are derived from them; moon phase is computed locally.
- **Conditions field** — a faint lattice of dots over the region, each coloured by
  live cloud cover (clear → teal, overcast → grey), showing where the sky is clearest
  right now.
- **Spot photos** — selecting a marker pulls a real nearby photograph from
  [Wikimedia Commons](https://commons.wikimedia.org) (keyless, CC-attributed) for the
  detail panel, falling back to the illustrated SkyScene when none is found. See
  `lib/photos.ts` and `components/PlacePhoto.tsx`.
- **Location & worldwide search** — on load the app restores your last location
  if you've visited before (persisted to `localStorage`, so returning users skip
  the cold start); otherwise it detects your approximate location via a keyless IP
  lookup (`ipLocate`, no prompt, works in in-app browsers). Precise GPS is
  **opt-in** — the app never auto-prompts; tap **Use precise location** (the pin in
  the nav, or the action in the location warning) to grant it. On denial or
  timeout the IP location is kept and a brief, non-blocking notice appears. If no
  location can be resolved, a warning modal (`components/LocationWarning.tsx`)
  nudges you to search manually. The nav search resolves any city/region via
  keyless [Nominatim](https://nominatim.openstreetmap.org) geocoding; picking a
  result recenters the map and refetches live spots + weather + the conditions
  grid there.
- **Day switcher** — a minimalist calendar (`components/DatePicker.tsx`) browses best
  spots across dates (recent past → ~2-week forecast). Each day fetches that date's
  conditions at the relevant event hour (sunrise/sunset/late-night) plus that day's
  moon phase, so the ranking and timings are date-accurate. The feed tag reads
  **Live** (today), **Forecast** (future) or **Archive** (past).

### How "Best Places" is ranked

Each discovered spot gets a live 0–100 score from `deriveScore` (`lib/weather.ts`),
and the list ranks them together (top 12):

- **Sunrise / Sunset** weight a clear **horizon** (low cloud is the enemy), a *moderate*
  amount of **mid/high cloud** that catches colour, and visibility. Rain penalises.
- **Night** weights a clear, **dark (new-moon)** sky and visibility.

Because the inputs are live, the ranking reorders as conditions change. Every day
— **including today** — is scored at the relevant event hour (sunrise time,
sunset time, ~22:00 for night), not at the current clock hour, so tonight's
stargazing ranking reflects the late-evening sky rather than whatever it's doing
at midday. Today's conditions **field** still shows "right now".

If a feed is unreachable, or the upstream returns a gappy/empty payload for a date
it can't serve, the readout shows a **Sample** tag instead of **Live** (never
fabricated "clear" zeros), and the last good live data is kept through transient
refresh blips.

### Loading

The feed loads in two **fully independent** phases so the app goes Live fast and
one phase's failure can't hide the other's results:

1. **Base** — weather for the conditions-field grid + your location anchor. No
   Overpass on this path, so it flips to **Live** in roughly one request.
2. **Discovery** — Overpass discovery (it races the public mirrors with a timeout
   so a slow one can't stall) plus weather for the spots it finds, folded into the
   map a beat later. A weatherless anchor shows immediately so the map is never
   empty, and the placeholder is dropped once real spots arrive.

Either phase can fail without blocking the other: a base-weather blip still shows
discovered spots (and stays **Live**), and an empty discovery is treated as a
legitimate "nothing here" (also **Live**) rather than a failure. Only when *both*
phases fail to produce any live data does the tag fall back to **Sample**.

## Stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS
- Framer Motion for transitions
- MapLibre GL (v5) on a **globe projection**, rendering Esri World Imagery satellite
  tiles (no API token required), desaturated and darkened via raster paint properties.
  The map opens zoomed out on a neutral globe and flies into your location.
- Open-Meteo for live per-coordinate conditions and sun times (keyless), with moon
  phase computed locally; see `lib/weather.ts` and `components/SkyDataProvider.tsx`
- Overpass API (OpenStreetMap) for live nearby spots and a cloud-cover conditions
  field; Nominatim for geocoding; see `lib/places.ts` and `components/ConditionsField.tsx`

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # eslint (next/core-web-vitals)
```

## Environment configuration

All configuration is public (`NEXT_PUBLIC_*`, inlined at build time) — no secrets.
Every value is optional and falls back to the current public host. See
`.env.example` for the full list. Key ones:

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_TILE_URL` / `_TILE_ATTRIBUTION` / `_TILE_MAXZOOM` | Basemap raster tiles | Esri World Imagery |
| `NEXT_PUBLIC_PRESERVE_DRAWING_BUFFER` | Keep WebGL buffer for screenshots | `true` |
| `NEXT_PUBLIC_NOMINATIM_BASE` | Geocoding base URL (proxy-ready) | public Nominatim |
| `NEXT_PUBLIC_OPEN_METEO_BASE` / `_ARCHIVE_BASE` | Weather base URL(s) | public Open-Meteo |
| `NEXT_PUBLIC_OVERPASS_ENDPOINTS` | Comma-separated Overpass mirrors (raced) | 4 public mirrors |
| `NEXT_PUBLIC_COMMONS_BASE` | Wikimedia Commons base URL | public Commons |
| `NEXT_PUBLIC_TELEMETRY_DSN` | Seam for an error/analytics sink | unset (dev-log / prod no-op) |

Resilience is built into the API layer (`lib/net.ts`): every external call has a
timeout, retries with backoff + jitter on 429/5xx (honouring `Retry-After`), and a
short in-memory cache (geocode 10 min, Overpass/weather 5 min, Commons 30 min) to
reduce load on the shared public APIs. Note that browsers cannot set a custom
`User-Agent`; the automatic `Referer` is what identifies the app to Nominatim.

### Production runbook

For real production traffic (the public keyless endpoints are rate-limited and
not licensed for commercial use), provision and point the config at:

- **Licensed or self-hosted map tiles** — set `NEXT_PUBLIC_TILE_URL` and
  `NEXT_PUBLIC_TILE_ATTRIBUTION`. If tiles repeatedly fail to load, the map shows a
  visible "Map imagery failed to load" overlay (not a black void) and reports
  `map_tiles` via telemetry.
- **A backend proxy you control** for Nominatim, Overpass and Open-Meteo (self-hosted
  instances or commercial tiers, with server-side caching), pointed at via the
  `_BASE` / `_ENDPOINTS` vars. Move to an Open-Meteo commercial plan for commercial use.
- **A telemetry sink** — wire Sentry/analytics at the seams in `lib/telemetry.ts`
  and set `NEXT_PUBLIC_TELEMETRY_DSN`.

How failures surface: unreachable/gappy feeds → **Sample** tag (never fabricated
data); tile failure → overlay; all handled failures and empty results →
`reportError` / `reportEvent`.

> The forecast weather endpoint reliably backfills ~92 days of recent past;
> `PAST_DAYS` (in `lib/dateUtils.ts`) is kept at a conservative 60 within that
> window. Dates the endpoint can't serve return an empty payload, which is treated
> as a failure (Sample tag) rather than emitting zeros.

## How it works

The map opens on a neutral globe and flies into your detected location. The bottom
dock has three modes, and selecting one drives the rest of the UI:

| Mode       | Theme       | Camera                       |
| ---------- | ----------- | ---------------------------- |
| Sunrise    | Warm gold   | Looks east toward first light |
| Sunset     | Golden hour | Looks west toward the sun (default) |
| Night Deck | Cosmic blue | Top-down for stargazing       |

Changing mode:

- **Reframes the camera** — `fitBounds` frames the active mode's markers, keeping the
  per-mode bearing/pitch (east for sunrise, west for sunset, top-down for night; see
  `MODE_CAMERA` in `lib/skyData.ts`).
- **Recolors the map** — a per-mode color grade (haze, horizon glow, tint, vignette) is
  layered over the satellite tiles; night mode adds a starfield.
- **Swaps the markers** — each viewing location is surfaced per mode and shown only in
  that mode. Markers stay pinned to real coordinates as you pan and zoom.
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
- The per-mode SVG sky scene (`SkyScene`) lives as a compact thumbnail in the detail
  sidebar; metric values are qualitative on purpose ("Light", "Crisp", "Far").

## Structure

```
app/
  layout.tsx           # Inter Tight font, page metadata
  globals.css          # glass primitives, keyframes, utilities
  page.tsx             # mode/selection/hover state, map wiring, layout composition
components/
  SkyDataProvider.tsx  # live feed: discovers/derives markers, field, status, location, date
  MapBackground.tsx    # MapLibre satellite globe + per-mode color grade + fit-to-bounds
  MapContext.tsx       # shares the map instance with marker overlays
  MapMarkers.tsx       # geo-anchored markers, filtered by mode, hover/selection sync
  ConditionsField.tsx  # live cloud-cover lattice of dots behind the markers
  MarkerDetail.tsx     # collapsible sidebar with per-place content + photo
  BestPlaces.tsx       # ranked list of the active mode's spots, synced with the map
  SearchOverlay.tsx    # on-map + worldwide place search (geocoding)
  LocationWarning.tsx  # modal shown when auto-locate fails
  DatePicker.tsx       # day switcher (historical / today / forecast)
  PlacePhoto.tsx       # Wikimedia Commons hero photo, falls back to SkyScene
  TopNav.tsx           # top nav bar with mode + location context
  SkyScene.tsx         # per-mode SVG sky illustration
  ObservationDock.tsx  # mode switcher (the three tabs)
lib/
  skyData.ts           # modes, palettes, camera moves, neutral default, types
  weather.ts           # Open-Meteo fetch, scoring, moon phase, condition labels
  places.ts            # Overpass discovery, Nominatim geocode, IP locate, grid
  photos.ts            # Wikimedia Commons photo lookup
  dateUtils.ts         # day-switcher date helpers
  net.ts               # resilient fetchJSON: timeout, retry/backoff, cache
  config.ts            # env-configurable endpoints + tiles (proxy-ready)
  telemetry.ts         # pluggable reportError / reportEvent seam
  persist.ts           # SSR-safe last location + mode persistence
  geolocate.ts         # opt-in precise GPS helper
  useFocusTrap.ts      # inline focus-trap hook for dialogs
app/
  error.tsx            # route-level error boundary
  global-error.tsx     # root error boundary
```

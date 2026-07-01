/**
 * Runtime configuration for external endpoints and map tiles.
 *
 * Every value reads a `NEXT_PUBLIC_*` env var (inlined at build time by Next)
 * and falls back to the current public host, so pointing the app at a
 * self-hosted instance or a proxy you own is a deploy-time config change, not a
 * code change. No secrets belong here — only public configuration.
 *
 * NB: Next.js only inlines *literal* `process.env.NEXT_PUBLIC_X` references, so
 * each var below is referenced directly rather than through a dynamic lookup.
 */

/* ---- map tiles ------------------------------------------------------------ */

export const TILE_URL =
  process.env.NEXT_PUBLIC_TILE_URL ||
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ||
  "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community";

export const TILE_MAXZOOM = numberEnv(
  process.env.NEXT_PUBLIC_TILE_MAXZOOM,
  19,
);

/**
 * Keep the WebGL drawing buffer so screenshot tooling can capture the canvas.
 * Costs a little memory; disable via `NEXT_PUBLIC_PRESERVE_DRAWING_BUFFER=false`.
 */
export const PRESERVE_DRAWING_BUFFER =
  (process.env.NEXT_PUBLIC_PRESERVE_DRAWING_BUFFER || "true") !== "false";

/* ---- API base URLs (proxy-ready) ------------------------------------------ */

export const NOMINATIM_BASE =
  process.env.NEXT_PUBLIC_NOMINATIM_BASE || "https://nominatim.openstreetmap.org";

export const OPEN_METEO_BASE =
  process.env.NEXT_PUBLIC_OPEN_METEO_BASE || "https://api.open-meteo.com";

export const OPEN_METEO_ARCHIVE_BASE =
  process.env.NEXT_PUBLIC_OPEN_METEO_ARCHIVE_BASE ||
  "https://archive-api.open-meteo.com";

export const COMMONS_BASE =
  process.env.NEXT_PUBLIC_COMMONS_BASE || "https://commons.wikimedia.org";

/**
 * Overpass mirrors, comma-separated. The public servers vary wildly in latency,
 * so the default lists several and the client races them; a proxy deployment can
 * override with a single host.
 */
export const OVERPASS_ENDPOINTS = listEnv(
  process.env.NEXT_PUBLIC_OVERPASS_ENDPOINTS,
  [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ],
);

/* ---- helpers -------------------------------------------------------------- */

function numberEnv(raw: string | undefined, fallback: number): number {
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function listEnv(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : fallback;
}

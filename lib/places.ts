/**
 * Real, nearby places around the home region — fetched live from OpenStreetMap
 * so the map fills with actual viewpoints, peaks and volcanoes rather than only
 * the curated authored spots.
 *
 * Source: Overpass API (https://overpass-api.de) — free and keyless, like the
 * map tiles and the Open-Meteo feed. Runs in the browser. Everything degrades
 * gracefully: if Overpass is unreachable the app simply keeps the authored set.
 */

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * Real, named places around the Bromo–Tengger–Semeru caldera, bundled so the
 * map always has plenty of points even when the public Overpass servers are
 * rate-limited or unreachable. Coordinates are real; live conditions are still
 * fetched per point, so these stay "updated" regardless of Overpass. Names here
 * deliberately differ from the curated authored spots to avoid duplicates.
 */
export const FALLBACK_PLACES: DiscoveredPlace[] = [
  { id: "loc-bromo", name: "Gunung Bromo", lat: -7.9425, lng: 112.953, kind: "volcano", elevationM: 2329 },
  { id: "loc-batok", name: "Gunung Batok", lat: -7.9236, lng: 112.9447, kind: "volcano", elevationM: 2470 },
  { id: "loc-semeru", name: "Gunung Semeru (Mahameru)", lat: -8.1077, lng: 112.9224, kind: "volcano", elevationM: 3676 },
  { id: "loc-kursi", name: "Gunung Kursi", lat: -7.927, lng: 112.9667, kind: "peak", elevationM: 3392 },
  { id: "loc-watangan", name: "Gunung Watangan", lat: -7.955, lng: 112.97, kind: "peak", elevationM: 2661 },
  { id: "loc-kingkong", name: "Bukit Kingkong", lat: -7.9065, lng: 112.9512, kind: "viewpoint", elevationM: 2600 },
  { id: "loc-cinta", name: "Bukit Cinta", lat: -7.9095, lng: 112.9525, kind: "viewpoint", elevationM: 2680 },
  { id: "loc-cemoro", name: "Cemoro Lawang", lat: -7.914, lng: 112.956, kind: "viewpoint", elevationM: 2217 },
  { id: "loc-ayek", name: "Gunung Ayek-Ayek", lat: -7.93, lng: 112.9, kind: "peak", elevationM: 2819 },
  { id: "loc-pundak", name: "Gunung Pundak", lat: -7.89, lng: 112.93, kind: "peak", elevationM: 1585 },
  { id: "loc-b29", name: "Puncak B29 Argosari", lat: -8.03, lng: 112.99, kind: "viewpoint", elevationM: 2900 },
  { id: "loc-jantur", name: "Air Terjun Jantur viewpoint", lat: -7.97, lng: 112.92, kind: "viewpoint", elevationM: 2100 },
];

/** A geocoded location result for the worldwide search. */
export interface GeoResult {
  /** display label, e.g. "Reykjavík, Iceland" */
  name: string;
  /** [lng, lat] */
  center: [number, number];
}

/**
 * Geocode an arbitrary query to coordinates via OpenStreetMap Nominatim
 * (keyless, CORS-enabled). Used by the worldwide place search.
 */
export async function geocode(
  query: string,
  signal?: AbortSignal,
  limit = 5,
): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    format: "jsonv2",
    q,
    limit: String(limit),
    "accept-language": "en",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({
    name: shortLabel(r.display_name),
    center: [parseFloat(r.lon), parseFloat(r.lat)] as [number, number],
  }));
}

/** Trim a long Nominatim display name to the first couple of components. */
function shortLabel(display: string): string {
  const parts = display.split(",").map((s) => s.trim());
  if (parts.length <= 2) return display;
  return `${parts[0]}, ${parts[parts.length - 1]}`;
}

/**
 * Reverse-geocode coordinates to a human-readable place name (keyless
 * Nominatim). Used to label the user's detected location.
 */
export async function reverseGeocode(
  lng: number,
  lat: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "12",
    "accept-language": "en",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Nominatim reverse ${res.status}`);
  const row = (await res.json()) as {
    display_name?: string;
    name?: string;
    address?: Record<string, string>;
  };
  const a = row.address ?? {};
  const locality =
    a.city ?? a.town ?? a.village ?? a.suburb ?? a.county ?? row.name;
  if (locality) {
    return a.country ? `${locality}, ${a.country}` : locality;
  }
  return row.display_name ? shortLabel(row.display_name) : null;
}

/**
 * Approximate location from the visitor's IP — keyless and **permission-free**,
 * so it works even in in-app browsers (Telegram/WhatsApp/IG) where the precise
 * Geolocation API is blocked or silently never resolves. Used as the instant
 * default location, later refined by precise GPS if the user allows it.
 */
export async function ipLocate(signal?: AbortSignal): Promise<GeoResult | null> {
  const sources: { url: string; parse: (j: any) => GeoResult | null }[] = [
    {
      url: "https://ipwho.is/",
      parse: (j) =>
        j && j.success !== false && j.latitude != null
          ? mkGeo(j.longitude, j.latitude, j.city, j.country)
          : null,
    },
    {
      url: "https://ipapi.co/json/",
      parse: (j) =>
        j && j.latitude != null
          ? mkGeo(j.longitude, j.latitude, j.city, j.country_name)
          : null,
    },
  ];
  for (const s of sources) {
    try {
      const res = await fetch(s.url, { signal });
      if (!res.ok) continue;
      const r = s.parse(await res.json());
      if (r) return r;
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  return null;
}

function mkGeo(lng: unknown, lat: unknown, city?: string, country?: string): GeoResult {
  const name = [city, country].filter(Boolean).join(", ") || "Your area";
  return { name, center: [Number(lng), Number(lat)] };
}

/** A real place discovered near the home region. */
export interface DiscoveredPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** viewpoint | peak | volcano */
  kind: string;
  /** metres, when OSM carries an elevation tag */
  elevationM?: number;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Fetch nearby open-horizon, sky-relevant features within `radiusKm` of a
 * centre — viewpoints, peaks, volcanoes, hills, beaches, capes/headlands and
 * observation towers. Results are de-duplicated, sorted by distance, and capped.
 */
export async function fetchNearbyPlaces(
  center: [number, number], // [lng, lat]
  radiusKm = 45,
  limit = 24,
  signal?: AbortSignal,
): Promise<DiscoveredPlace[]> {
  const [lng, lat] = center;
  const radius = Math.round(radiusKm * 1000);
  // shared "(around:R,lat,lng)" clause for every category below
  const a = `(around:${radius},${lat},${lng})`;
  // `nwr` = nodes, ways and relations (some viewpoints/beaches are areas);
  // `out center` gives ways/relations a representative point to drop a pin on.
  const query = `
    [out:json][timeout:25];
    (
      nwr["tourism"="viewpoint"]${a};
      nwr["natural"="peak"]["name"]${a};
      nwr["natural"="volcano"]["name"]${a};
      nwr["natural"="hill"]["name"]${a};
      nwr["natural"="beach"]["name"]${a};
      nwr["natural"="cape"]["name"]${a};
      nwr["man_made"="tower"]["tower:type"="observation"]${a};
    );
    out center ${Math.max(limit * 4, 80)};
  `;

  const json = await postOverpass(query, signal);
  const seen = new Set<string>();

  const places = (json.elements as OverpassElement[])
    .map((el): DiscoveredPlace | null => {
      const elat = el.lat ?? el.center?.lat;
      const elon = el.lon ?? el.center?.lon;
      const name = el.tags?.name;
      if (elat == null || elon == null || !name) return null;

      const ele = el.tags?.ele ? parseFloat(el.tags.ele) : undefined;
      return {
        id: `osm-${el.type}-${el.id}`,
        name,
        lat: elat,
        lng: elon,
        kind: kindOf(el.tags),
        elevationM: Number.isFinite(ele) ? ele : undefined,
      };
    })
    .filter((p): p is DiscoveredPlace => {
      if (!p) return false;
      const key = `${p.name}@${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        haversineKm(lat, lng, a.lat, a.lng) -
        haversineKm(lat, lng, b.lat, b.lng),
    )
    .slice(0, limit);

  return places;
}

/** Map an OSM element's tags to one of our spot `kind`s. */
function kindOf(tags?: Record<string, string>): string {
  if (tags?.natural === "volcano") return "volcano";
  if (tags?.natural === "peak") return "peak";
  if (tags?.natural === "hill") return "hill";
  if (tags?.natural === "beach") return "beach";
  if (tags?.natural === "cape") return "cape";
  if (tags?.man_made === "tower") return "tower";
  return "viewpoint";
}

/** Try each Overpass mirror in turn so one being down (or rate-limiting) isn't fatal. */
async function postOverpass(
  query: string,
  signal?: AbortSignal,
): Promise<{ elements: OverpassElement[] }> {
  let lastErr: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal,
      });
      // 429 / 504 are common on the public mirrors — move on to the next one
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      return await res.json();
    } catch (err) {
      if (signal?.aborted) throw err;
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Overpass unreachable");
}

/**
 * Combine live Overpass results with the bundled fallback set: live results win
 * on accuracy, the fallback guarantees a healthy number of points, and anything
 * matching an excluded (authored) name is dropped. De-duplicated by name and
 * sorted by distance from `center`, then capped.
 */
export function combinePlaces(
  fetched: DiscoveredPlace[],
  center: [number, number], // [lng, lat]
  excludeNames: string[] = [],
  cap = 22,
  includeFallback = true,
): DiscoveredPlace[] {
  const [lng, lat] = center;
  const norm = (s: string) => s.trim().toLowerCase();
  const blocked = new Set(excludeNames.map(norm));
  const byName = new Map<string, DiscoveredPlace>();

  // live first (accurate coords); the Bromo fallback only fills in at home
  const pool = includeFallback ? [...fetched, ...FALLBACK_PLACES] : fetched;
  for (const p of pool) {
    const key = norm(p.name);
    if (blocked.has(key) || byName.has(key)) continue;
    byName.set(key, p);
  }

  return Array.from(byName.values())
    .sort(
      (a, b) =>
        haversineKm(lat, lng, a.lat, a.lng) -
        haversineKm(lat, lng, b.lat, b.lng),
    )
    .slice(0, cap);
}

/* ---- conditions grid ------------------------------------------------------ */

/** One sample point in the live "sky conditions" field. */
export interface GridPoint {
  id: string;
  lat: number;
  lng: number;
}

/**
 * Build an evenly-spaced lattice of coordinates spanning a box of `spanKm`
 * around the centre — the sample points for the live cloud-cover field.
 */
export function buildConditionsGrid(
  center: [number, number], // [lng, lat]
  cols = 7,
  rows = 5,
  spanKm = 44,
): GridPoint[] {
  const [lng, lat] = center;
  const dLat = spanKm / 111; // ~111 km per degree latitude
  const dLng = spanKm / (111 * Math.cos((lat * Math.PI) / 180));
  const points: GridPoint[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fx = cols === 1 ? 0.5 : c / (cols - 1); // 0..1
      const fy = rows === 1 ? 0.5 : r / (rows - 1);
      points.push({
        id: `grid-${r}-${c}`,
        lat: lat + (fy - 0.5) * dLat,
        lng: lng + (fx - 0.5) * dLng,
      });
    }
  }
  return points;
}

/* ---- helpers -------------------------------------------------------------- */

/** Great-circle distance in km between two [lng, lat] points. */
export function kmBetween(a: [number, number], b: [number, number]): number {
  return haversineKm(a[1], a[0], b[1], b[0]);
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

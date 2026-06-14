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
      // very CORS-friendly from browsers
      url: "https://get.geojs.io/v1/ip/geo.json",
      parse: (j) =>
        j && j.latitude != null
          ? mkGeo(j.longitude, j.latitude, j.city, j.country)
          : null,
    },
    {
      url: "https://ipwho.is/",
      parse: (j) =>
        j && j.success !== false && j.latitude != null
          ? mkGeo(j.longitude, j.latitude, j.city, j.country)
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
  // peaks/volcanoes/hills are tagged on plain nodes, so query those as `node`
  // (cheap); only the categories that can be areas use `nwr` + `out center`.
  // A tight server timeout keeps a slow region from stalling the whole sync.
  const query = `
    [out:json][timeout:12];
    (
      nwr["tourism"="viewpoint"]${a};
      node["natural"="peak"]["name"]${a};
      node["natural"="volcano"]["name"]${a};
      node["natural"="hill"]["name"]${a};
      nwr["natural"="beach"]["name"]${a};
      nwr["natural"="cape"]["name"]${a};
      nwr["man_made"="tower"]["tower:type"="observation"]${a};
    );
    out center ${Math.max(limit * 3, 60)};
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

/** Per-mirror request timeout — fail fast so a slow/queued mirror can't stall. */
const OVERPASS_TIMEOUT_MS = 8000;

/**
 * Query the Overpass mirrors **concurrently** and take the first that answers,
 * each capped by its own timeout. The public servers vary wildly in latency
 * moment to moment (queuing, 429/504, downtime), so racing them — rather than
 * awaiting one at a time — keeps a single slow mirror from stalling the sync.
 */
async function postOverpass(
  query: string,
  signal?: AbortSignal,
): Promise<{ elements: OverpassElement[] }> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const controllers = OVERPASS_ENDPOINTS.map(() => new AbortController());
  const abortAll = () => controllers.forEach((c) => c.abort());
  signal?.addEventListener("abort", abortAll, { once: true });

  const attempts = OVERPASS_ENDPOINTS.map((endpoint, i) => {
    const c = controllers[i];
    const timer = setTimeout(() => c.abort(), OVERPASS_TIMEOUT_MS);
    return fetch(endpoint, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: c.signal,
    })
      .then(async (res) => {
        // 429 / 504 are common on the public mirrors — treat as a loss so the
        // race can settle on a healthier one
        if (!res.ok) throw new Error(`Overpass ${res.status}`);
        return (await res.json()) as { elements: OverpassElement[] };
      })
      .finally(() => clearTimeout(timer));
  });

  try {
    const result = await Promise.any(attempts);
    abortAll(); // cancel the slower in-flight mirrors once one wins
    return result;
  } catch {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw new Error("Overpass unreachable");
  } finally {
    signal?.removeEventListener("abort", abortAll);
  }
}

/**
 * De-duplicate and rank live Overpass results: anything matching an excluded
 * (curated) name is dropped, the rest are de-duplicated by name, sorted by
 * distance from `center`, then capped.
 */
export function combinePlaces(
  fetched: DiscoveredPlace[],
  center: [number, number], // [lng, lat]
  excludeNames: string[] = [],
  cap = 22,
): DiscoveredPlace[] {
  const [lng, lat] = center;
  const norm = (s: string) => s.trim().toLowerCase();
  const blocked = new Set(excludeNames.map(norm));
  const byName = new Map<string, DiscoveredPlace>();

  for (const p of fetched) {
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

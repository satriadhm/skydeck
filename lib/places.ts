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
];

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
 * Fetch named viewpoints, peaks and volcanoes within `radiusKm` of a centre.
 * Results are de-duplicated, sorted by distance from centre, and capped.
 */
export async function fetchNearbyPlaces(
  center: [number, number], // [lng, lat]
  radiusKm = 28,
  limit = 16,
  signal?: AbortSignal,
): Promise<DiscoveredPlace[]> {
  const [lng, lat] = center;
  const radius = Math.round(radiusKm * 1000);
  const query = `
    [out:json][timeout:20];
    (
      node["tourism"="viewpoint"](around:${radius},${lat},${lng});
      node["natural"="peak"]["name"](around:${radius},${lat},${lng});
      node["natural"="volcano"]["name"](around:${radius},${lat},${lng});
    );
    out body ${Math.max(limit * 4, 60)};
  `;

  const json = await postOverpass(query, signal);
  const seen = new Set<string>();

  const places = (json.elements as OverpassElement[])
    .map((el): DiscoveredPlace | null => {
      const elat = el.lat ?? el.center?.lat;
      const elon = el.lon ?? el.center?.lon;
      const name = el.tags?.name;
      if (elat == null || elon == null || !name) return null;

      const kind =
        el.tags?.natural === "volcano"
          ? "volcano"
          : el.tags?.natural === "peak"
            ? "peak"
            : "viewpoint";

      const ele = el.tags?.ele ? parseFloat(el.tags.ele) : undefined;
      return {
        id: `osm-${el.type}-${el.id}`,
        name,
        lat: elat,
        lng: elon,
        kind,
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

/** Try each Overpass mirror in turn so one being down isn't fatal. */
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
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      return await res.json();
    } catch (err) {
      if (signal?.aborted) throw err;
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Overpass unreachable");
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

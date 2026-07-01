/**
 * Real photographs for a spot, fetched live from Wikimedia Commons — keyless and
 * CORS-enabled (origin=*), matching the rest of Sky Deck's no-token sources.
 *
 * We geosearch the File namespace around the spot's coordinate and pick the best
 * nearby photo. Commons images are CC-licensed, so we surface attribution and a
 * link back to the file page. If nothing suitable is found the caller falls back
 * to the illustrated SkyScene.
 */

import { fetchJSON } from "./net";
import { COMMONS_BASE } from "./config";

const COMMONS_API = `${COMMONS_BASE}/w/api.php`;

/** Commons photos for a coordinate change slowly; cache by rounded coordinate. */
const PHOTO_TTL_MS = 30 * 60 * 1000;

export interface SkyPhoto {
  /** ~640px-wide thumbnail, ready for an <img src> */
  thumbUrl: string;
  /** Commons file page, for attribution link */
  descUrl: string;
  /** file title, e.g. "File:Mount Bromo.jpg" */
  title: string;
  /** photographer / author, plain text (may be empty) */
  artist?: string;
  /** short license, e.g. "CC BY-SA 4.0" */
  license?: string;
}

interface CommonsPage {
  title: string;
  index?: number;
  imageinfo?: {
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    mediatype?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

/**
 * Best nearby Commons photo for a coordinate, or null if none qualifies.
 *
 * The image is only ever *near* the spot (Commons has no per-POI feed), so the
 * radius is kept tight (default ~3.5 km) to reduce unrelated subjects, and when
 * the spot has a real (non-generic) `name` a candidate whose title loosely
 * matches it is preferred over the merely-nearest one. The attribution copy
 * signals proximity rather than implying the photo *is* the spot.
 */
export async function fetchPlacePhoto(
  lat: number,
  lng: number,
  signal?: AbortSignal,
  radiusM = 3500,
  name?: string,
): Promise<SkyPhoto | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "geosearch",
    ggsnamespace: "6", // File namespace
    ggscoord: `${lat}|${lng}`,
    ggsradius: String(Math.min(radiusM, 10000)),
    ggslimit: "24",
    prop: "imageinfo",
    iiprop: "url|mediatype|extmetadata",
    iiurlwidth: "640",
  });

  const json = await fetchJSON<any>(`${COMMONS_API}?${params}`, {
    signal,
    cacheKey: `commons:${lat.toFixed(2)},${lng.toFixed(2)}:${Math.min(radiusM, 10000)}`,
    cacheTtlMs: PHOTO_TTL_MS,
  });
  const pages: CommonsPage[] = Object.values(json?.query?.pages ?? {});
  if (pages.length === 0) return null;

  // geosearch returns nearest-first via `index`
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  // collect all usable candidates in nearest-first order
  const usable = pages.filter((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) return false;
    if (info.mediatype && info.mediatype !== "BITMAP") return false; // skip SVG/maps/audio
    return isLikelyPhoto(page.title);
  });
  if (usable.length === 0) return null;

  // prefer a title that loosely matches a real place name; else take the nearest
  const nameMatch = isGenericName(name)
    ? undefined
    : usable.find((page) => titleMatchesName(page.title, name!));
  const chosen = nameMatch ?? usable[0];

  const info = chosen.imageinfo![0]!;
  const meta = info.extmetadata ?? {};
  return {
    thumbUrl: info.thumburl!,
    descUrl: info.descriptionurl ?? info.url ?? "",
    title: chosen.title,
    artist: stripHtml(meta.Artist?.value),
    license: meta.LicenseShortName?.value?.trim() || undefined,
  };
}

/** Generic kind-derived labels (from `genericName` in places.ts) aren't real names. */
const GENERIC_NAMES = new Set([
  "viewpoint",
  "beach",
  "headland",
  "clifftop",
  "observation deck",
  "hilltop",
  "saddle",
  "your location",
]);

function isGenericName(name?: string): boolean {
  if (!name) return true;
  return GENERIC_NAMES.has(name.trim().toLowerCase());
}

/** Does a Commons file title loosely contain the spot's distinctive words? */
function titleMatchesName(title: string, name: string): boolean {
  const clean = title
    .replace(/^File:/i, "")
    .replace(/\.\w+$/, "")
    .toLowerCase();
  // match on the longer words of the name, so short filler ("the", "mt") is ignored
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  return words.length > 0 && words.some((w) => clean.includes(w));
}

/** Filter obvious non-scenery: maps, diagrams, flags, coats of arms, logos. */
function isLikelyPhoto(title: string): boolean {
  const t = title.toLowerCase();
  if (!/\.(jpe?g|png|webp)$/i.test(t)) return false;
  return !/(map|diagram|chart|logo|flag|coat[\s_-]?of[\s_-]?arms|seal|icon|plan)/.test(
    t,
  );
}

/** Strip HTML tags / collapse whitespace from Commons attribution markup. */
function stripHtml(html?: string): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

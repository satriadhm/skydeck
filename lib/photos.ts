/**
 * Real photographs for a spot, fetched live from Wikimedia Commons — keyless and
 * CORS-enabled (origin=*), matching the rest of Sky Deck's no-token sources.
 *
 * We geosearch the File namespace around the spot's coordinate and pick the best
 * nearby photo. Commons images are CC-licensed, so we surface attribution and a
 * link back to the file page. If nothing suitable is found the caller falls back
 * to the illustrated SkyScene.
 */

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

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
 * `radiusM` is capped at 10 km (the Commons geosearch maximum).
 */
export async function fetchPlacePhoto(
  lat: number,
  lng: number,
  signal?: AbortSignal,
  radiusM = 10000,
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

  const res = await fetch(`${COMMONS_API}?${params}`, { signal });
  if (!res.ok) throw new Error(`Commons ${res.status}`);

  const json = await res.json();
  const pages: CommonsPage[] = Object.values(json?.query?.pages ?? {});
  if (pages.length === 0) return null;

  // geosearch returns nearest-first via `index`
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) continue;
    if (info.mediatype && info.mediatype !== "BITMAP") continue; // skip SVG/maps/audio
    if (!isLikelyPhoto(page.title)) continue;

    const meta = info.extmetadata ?? {};
    return {
      thumbUrl: info.thumburl,
      descUrl: info.descriptionurl ?? info.url ?? "",
      title: page.title,
      artist: stripHtml(meta.Artist?.value),
      license: meta.LicenseShortName?.value?.trim() || undefined,
    };
  }

  return null;
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

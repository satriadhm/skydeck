/**
 * Live atmospheric data for the sky-viewing spots.
 *
 * Source: Open-Meteo (https://open-meteo.com) — free, keyless, CORS-enabled,
 * which matches Sky Deck's no-token ethos (the map tiles need no key either).
 * One batched request covers every marker coordinate; results are reduced to
 * the handful of human-readable fields the UI already renders, and the quality
 * tier / score that drives ranking and theming are derived from them.
 *
 * Everything here is pure and side-effect free apart from `fetchLivePoints`,
 * so the provider can fall back to authored sample data if the network fails.
 */
import { type DeckMode, type StatusLevel } from "./skyData";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

/** Raw, reduced reading for a single coordinate. */
export interface LivePoint {
  /** cloud cover, % */
  cloudCover: number;
  /** relative humidity, % */
  humidity: number;
  /** horizontal visibility, metres */
  visibilityM: number;
  /** today's sunrise, location-local "HH:MM" */
  sunrise: string;
  /** today's sunset, location-local "HH:MM" */
  sunset: string;
}

/**
 * Fetch current conditions + today's sun times for many coordinates in a single
 * request. Open-Meteo accepts comma-separated latitude/longitude lists and
 * returns one result object per coordinate (in order).
 *
 * Runs in the browser, so it is unaffected by any server-side network policy.
 */
export async function fetchLivePoints(
  coords: { lng: number; lat: number }[],
  signal?: AbortSignal,
): Promise<LivePoint[]> {
  if (coords.length === 0) return [];

  const lat = coords.map((c) => c.lat).join(",");
  const lng = coords.map((c) => c.lng).join(",");
  // NB: `visibility` is an *hourly* Open-Meteo variable, not a `current` one —
  // requesting it under `current` yields nothing (and risks a 400), so we only
  // ask for it hourly and read the value for the current hour.
  const url =
    `${ENDPOINT}?latitude=${lat}&longitude=${lng}` +
    `&current=cloud_cover,relative_humidity_2m` +
    `&hourly=visibility&daily=sunrise,sunset&timezone=auto&forecast_days=1`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);

  const json = await res.json();
  // multi-coordinate responses come back as an array; a single one as an object
  const list = Array.isArray(json) ? json : [json];

  return list.map((d): LivePoint => ({
    cloudCover: d?.current?.cloud_cover ?? 0,
    humidity: d?.current?.relative_humidity_2m ?? 0,
    // prefer current if the API ever provides it, else the hourly value for now
    visibilityM:
      d?.current?.visibility ?? hourlyNow(d, "visibility") ?? 0,
    // strip to "HH:MM"; the strings are already in the location's local time,
    // so we must not reparse them through the viewer's timezone
    sunrise: localTime(d?.daily?.sunrise?.[0]),
    sunset: localTime(d?.daily?.sunset?.[0]),
  }));
}

/** Read an hourly variable at the location's current hour. */
function hourlyNow(d: any, key: string): number | undefined {
  const times: string[] | undefined = d?.hourly?.time;
  const values: number[] | undefined = d?.hourly?.[key];
  if (!times || !values) return undefined;
  // match the current hour ("YYYY-MM-DDTHH"); fall back to the first sample
  const nowHour = (d?.current?.time ?? times[0]).slice(0, 13);
  const idx = times.findIndex((t) => t.slice(0, 13) === nowHour);
  return values[idx >= 0 ? idx : 0];
}

/* ---- human-readable labels (mirror the authored sample vocabulary) -------- */

export function cloudLabel(pct: number): string {
  if (pct < 10) return "Clear";
  if (pct < 30) return "Light";
  if (pct < 60) return "Scattered";
  if (pct < 85) return "Broken";
  return "Overcast";
}

export function humidityLabel(pct: number): string {
  if (pct < 40) return "Crisp";
  if (pct < 60) return "Mild";
  if (pct < 80) return "Humid";
  return "Damp";
}

export function visibilityLabel(metres: number): string {
  const km = metres / 1000;
  if (km >= 20) return "Vast";
  if (km >= 12) return "Far";
  if (km >= 6) return "Fair";
  if (km >= 2) return "Moderate";
  return "Hazy";
}

/* ---- moon phase (pure astronomical calc, no network) ---------------------- */

export interface MoonInfo {
  phase: string;
  /** illuminated fraction, 0 (new) .. 1 (full) */
  illumination: number;
}

const SYNODIC = 29.530588853; // mean length of a lunar month, days

export function moonInfo(date: Date = new Date()): MoonInfo {
  // days from a known new moon: 2000-01-06 18:14 UTC
  const ref = Date.UTC(2000, 0, 6, 18, 14) / 86_400_000;
  const now = date.getTime() / 86_400_000;
  const age = (((now - ref) % SYNODIC) + SYNODIC) % SYNODIC;
  const illumination = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;

  const phase =
    age < 1.0 || age >= SYNODIC - 1.0
      ? "New Moon"
      : age < SYNODIC / 4 - 1
        ? "Waxing Crescent"
        : age < SYNODIC / 4 + 1
          ? "First Quarter"
          : age < SYNODIC / 2 - 1
            ? "Waxing Gibbous"
            : age < SYNODIC / 2 + 1
              ? "Full Moon"
              : age < (3 * SYNODIC) / 4 - 1
                ? "Waning Gibbous"
                : age < (3 * SYNODIC) / 4 + 1
                  ? "Last Quarter"
                  : "Waning Crescent";

  return { phase, illumination };
}

/* ---- quality scoring (drives ranking + theming) --------------------------- */

/**
 * 0–100 quality score for a spot given live conditions. Clear skies and long
 * visibility help every mode; Night Deck additionally rewards a dark (new) moon.
 */
export function deriveScore(
  mode: DeckMode,
  p: LivePoint,
  moonIllumination: number,
): number {
  const clarity = 100 - p.cloudCover; // less cloud, better
  const visFactor = Math.min(1, p.visibilityM / 1000 / 20); // 0..1, caps at 20 km

  if (mode === "night") {
    const darkness = 1 - moonIllumination; // darker sky, better
    return clamp(clarity * 0.6 + visFactor * 100 * 0.2 + darkness * 100 * 0.2);
  }
  // sunrise / sunset weight clarity most, with a visibility bonus
  return clamp(clarity * 0.7 + visFactor * 100 * 0.3);
}

export function scoreToStatus(score: number): StatusLevel {
  if (score >= 88) return "exceptional";
  if (score >= 76) return "excellent";
  if (score >= 62) return "good";
  return "average";
}

const MODE_NOUN: Record<DeckMode, string> = {
  sunrise: "Sunrise",
  sunset: "Sunset",
  night: "Stargazing",
};

export function conditionText(mode: DeckMode): string {
  return `${MODE_NOUN[mode]} Conditions`;
}

/** Live timing window built from today's actual sun times. */
export function liveWindow(mode: DeckMode, p: LivePoint): string {
  if (mode === "sunrise") {
    return p.sunrise ? `First light around ${p.sunrise}` : "";
  }
  if (mode === "sunset") {
    return p.sunset ? `Golden hour into ${p.sunset}` : "";
  }
  // night deck: skies go properly dark ~90 min after sunset
  return p.sunset ? `Dark skies from ${addMinutes(p.sunset, 90)}` : "";
}

/**
 * Colour for a conditions-field dot: clear skies read teal/green, overcast
 * fades to a muted grey. `t` is cloud cover in %.
 */
export function clarityColor(cloudCoverPct: number): string {
  const clear = clamp(100 - cloudCoverPct) / 100; // 1 = clear, 0 = overcast
  // interpolate muted grey-blue -> bright teal as the sky clears
  const from = [120, 130, 150]; // overcast
  const to = [125, 249, 193]; // clear (matches the "exceptional" accent)
  const ch = (i: number) => Math.round(from[i] + (to[i] - from[i]) * clear);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

/* ---- internal helpers ----------------------------------------------------- */

function localTime(iso: string | undefined): string {
  const time = iso?.split("T")[1];
  return time ? time.slice(0, 5) : "";
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let total = (h * 60 + m + mins) % (24 * 60);
  if (total < 0) total += 24 * 60;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

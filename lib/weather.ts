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
import { fetchJSON } from "./net";
import { OPEN_METEO_BASE } from "./config";
import { reportEvent } from "./telemetry";

const ENDPOINT = `${OPEN_METEO_BASE}/v1/forecast`;

/** Cache live/forecast weather for a short window (rounded center + date). */
const WEATHER_TTL_MS = 5 * 60 * 1000;

/** Raw, reduced reading for a single coordinate. */
export interface LivePoint {
  /** total cloud cover, % */
  cloudCover: number;
  /** low cloud, % — blocks the horizon at sunrise/sunset */
  cloudLow: number;
  /** mid cloud, % — catches colour at golden hour in moderation */
  cloudMid: number;
  /** high cloud, % — the best colour-catcher in moderation */
  cloudHigh: number;
  /** relative humidity, % */
  humidity: number;
  /** precipitation in the current hour, mm */
  precip: number;
  /** horizontal visibility, metres */
  visibilityM: number;
  /** today's sunrise, location-local "HH:MM" */
  sunrise: string;
  /** today's sunset, location-local "HH:MM" */
  sunset: string;
}

/**
 * Conditions for one coordinate on a given day. Sky events happen at different
 * times, so we keep an event-time snapshot per mode (sunrise hour, sunset hour,
 * late night) plus a representative cloud value for the conditions field.
 */
export interface DayConditions {
  sunrise: string;
  sunset: string;
  byMode: Record<DeckMode, LivePoint>;
  /** representative cloud cover for the grid dot, % */
  fieldCloud: number;
}

/**
 * Fetch conditions for a specific calendar date (historical or forecast).
 * Pass `dateISO = null` for "today / now" (uses the live current reading).
 * Open-Meteo serves recent past + ~16-day forecast from the same endpoint.
 */
export async function fetchDayConditions(
  coords: { lng: number; lat: number }[],
  dateISO: string | null,
  signal?: AbortSignal,
): Promise<DayConditions[]> {
  if (coords.length === 0) return [];

  const lat = coords.map((c) => c.lat).join(",");
  const lng = coords.map((c) => c.lng).join(",");
  const hourlyVars =
    "cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high," +
    "visibility,relative_humidity_2m,precipitation";

  // Today and dated days both snapshot the hourly arrays at each event hour, so
  // tonight's ranking reflects ~22:00 cloud, not whatever the sky is doing now.
  // For today we additionally pull `current` to keep the conditions field
  // showing "right now".
  const url = !dateISO
    ? `${ENDPOINT}?latitude=${lat}&longitude=${lng}` +
      `&current=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,` +
      `relative_humidity_2m,precipitation` +
      `&hourly=${hourlyVars}&daily=sunrise,sunset&timezone=auto&forecast_days=1`
    : `${ENDPOINT}?latitude=${lat}&longitude=${lng}` +
      `&hourly=${hourlyVars}&daily=sunrise,sunset&timezone=auto` +
      `&start_date=${dateISO}&end_date=${dateISO}`;

  const json = await fetchJSON<unknown>(url, {
    signal,
    cacheTtlMs: WEATHER_TTL_MS,
  });
  // multi-coordinate responses come back as an array; a single one as an object
  const list = Array.isArray(json) ? json : [json];

  return list.map((d: any): DayConditions => {
    // A gappy upstream payload (empty hourly.time) must not become fabricated
    // "clear" zeros under a Live/Forecast/Archive tag — treat it as a failure so
    // the provider falls back to the Sample tag instead.
    if (!Array.isArray(d?.hourly?.time) || d.hourly.time.length === 0) {
      reportEvent("weather_empty_payload", { dateISO });
      throw new Error("Open-Meteo returned an empty hourly payload");
    }
    const sunrise = localTime(d?.daily?.sunrise?.[0]);
    const sunset = localTime(d?.daily?.sunset?.[0]);
    const snap = (hhmm: string) => snapshotAt(d, hhmm, sunrise, sunset);
    return {
      sunrise,
      sunset,
      byMode: {
        sunrise: snap(sunrise || "06:00"),
        sunset: snap(sunset || "18:00"),
        night: snap("22:00"),
      },
      // today: the field shows current cloud; dated: the event-hour snapshot
      fieldCloud: !dateISO
        ? d?.current?.cloud_cover ?? snap(sunset || "18:00").cloudCover
        : snap(sunset || "18:00").cloudCover,
    };
  });
}

/** Build a LivePoint from the hourly arrays at the hour nearest `hhmm`. */
function snapshotAt(
  d: any,
  hhmm: string,
  sunrise: string,
  sunset: string,
): LivePoint {
  const times: string[] = d?.hourly?.time ?? [];
  const hour = hhmm.slice(0, 2);
  let idx = times.findIndex((t) => t.slice(11, 13) === hour);
  if (idx < 0) idx = 0;
  const g = (k: string): number => d?.hourly?.[k]?.[idx] ?? 0;
  return {
    cloudCover: g("cloud_cover"),
    cloudLow: g("cloud_cover_low"),
    cloudMid: g("cloud_cover_mid"),
    cloudHigh: g("cloud_cover_high"),
    humidity: g("relative_humidity_2m"),
    precip: g("precipitation"),
    visibilityM: g("visibility"),
    sunrise,
    sunset,
  };
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
 * 0–100 quality score for a spot given live conditions.
 *
 * The model reflects how these events actually look:
 * - Sunrise/Sunset: you need a **clear horizon** (low cloud is the enemy), but a
 *   *moderate* amount of **mid/high cloud catches colour** — so a totally clear
 *   sky scores well, an overcast sky poorly, and a partly-high-cloud sky best.
 * - Night: rewards a clear, **dark (new-moon)** sky and long visibility.
 * Precipitation penalises every mode.
 */
export function deriveScore(
  mode: DeckMode,
  p: LivePoint,
  moonIllumination: number,
): number {
  const visFactor = Math.min(1, p.visibilityM / 1000 / 20); // 0..1, caps at 20 km
  const wetPenalty = Math.min(45, p.precip * 22); // even light rain hurts

  if (mode === "night") {
    const clear = 100 - p.cloudCover;
    const darkness = (1 - moonIllumination) * 100; // darker sky, better
    const dampPenalty = Math.max(0, p.humidity - 85) * 0.6; // heavy haze
    return clamp(
      clear * 0.5 + darkness * 0.3 + visFactor * 100 * 0.2 - wetPenalty - dampPenalty,
    );
  }

  // sunrise / sunset
  const horizon = 100 - p.cloudLow; // the sun must clear the horizon
  const colour = colourPotential(p.cloudMid, p.cloudHigh); // 0..100, peaks mid-range
  return clamp(
    horizon * 0.5 + colour * 0.25 + visFactor * 100 * 0.25 - wetPenalty,
  );
}

/**
 * Golden-hour colour potential from mid/high cloud: a clear sky has little to
 * light up, an overcast one blocks the light — the sweet spot is partial high
 * cloud. Peaks around ~45% effective cover, weighting high cloud most.
 */
function colourPotential(cloudMid: number, cloudHigh: number): number {
  const effective = cloudHigh * 0.7 + cloudMid * 0.4;
  return clamp(100 - Math.abs(effective - 45) * 2.2);
}

export function scoreToStatus(score: number): StatusLevel {
  if (score >= 85) return "exceptional";
  if (score >= 72) return "excellent";
  if (score >= 56) return "good";
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

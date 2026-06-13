export type DeckMode = "sunrise" | "sunset" | "night";

export type StatusLevel = "exceptional" | "excellent" | "good" | "average";

export interface StatusMeta {
  label: string;
  color: string;
  animation: "pulse" | "glow" | "subtle" | "muted";
}

export const STATUS_META: Record<StatusLevel, StatusMeta> = {
  exceptional: { label: "Exceptional", color: "#7DF9C1", animation: "pulse" },
  excellent: { label: "Excellent", color: "#9CE7FF", animation: "glow" },
  good: { label: "Good", color: "#D2D8E2", animation: "subtle" },
  average: { label: "Average", color: "#9AA3B2", animation: "muted" },
};

export interface DeckTab {
  mode: DeckMode;
  label: string;
  status: StatusLevel;
  /** primary theme colors */
  palette: [string, string, string];
  /** soft halo / glow color */
  glow: string;
  /** accent used for active text + theming */
  accent: string;
}

export const DECK_TABS: DeckTab[] = [
  {
    mode: "sunrise",
    label: "Sunrise",
    status: "exceptional",
    palette: ["#FFD76A", "#FFC247", "#FFB52B"],
    glow: "rgba(255, 200, 95, 0.55)",
    accent: "#FFD76A",
  },
  {
    mode: "sunset",
    label: "Sunset",
    status: "excellent",
    palette: ["#FF9A5B", "#FF7D6A", "#FF5FA0"],
    glow: "rgba(255, 125, 106, 0.55)",
    accent: "#FF8E5D",
  },
  {
    mode: "night",
    label: "Night Deck",
    status: "good",
    palette: ["#7FA8FF", "#5E7CFF", "#A8C6FF"],
    glow: "rgba(110, 140, 255, 0.55)",
    accent: "#7FA8FF",
  },
];

/** Atmospheric hero metrics, keyed per mode for the cinematic "observation mode" shift. */
export interface AtmosphericReadout {
  condition: string;
  cloudCover: string;
  humidity: string;
  moonPhase: string;
  visibility: string;
  /** map layer descriptors revealed for this mode */
  layers: string[];
}

export const ATMOSPHERIC: Record<DeckMode, AtmosphericReadout> = {
  sunrise: {
    condition: "Exceptional Viewing Conditions",
    cloudCover: "Light",
    humidity: "Crisp",
    moonPhase: "Waning Crescent",
    visibility: "Far",
    layers: [
      "East-facing viewpoints",
      "Golden visibility zones",
      "Morning cloud forecast",
    ],
  },
  sunset: {
    condition: "Excellent Viewing Conditions",
    cloudCover: "Scattered",
    humidity: "Mild",
    moonPhase: "Waning Crescent",
    visibility: "Far",
    layers: [
      "Western horizon hotspots",
      "Golden-hour color outlook",
      "Atmospheric clarity",
    ],
  },
  night: {
    condition: "Good Stargazing Conditions",
    cloudCover: "Broken",
    humidity: "Humid",
    moonPhase: "Waning Crescent",
    visibility: "Fair",
    layers: [
      "Dark-sky reserves",
      "Light-pollution map",
      "Meteor & astronomy overlays",
    ],
  },
};

/**
 * Map home position — a dramatic alpine-lake region (Lake Wakatipu /
 * Queenstown, New Zealand): sharp mountain ranges, a glacial lake, forested
 * valleys, and certified dark-sky reserves that suit the
 * sunrise / sunset / night themes.
 */
export const MAP_CENTER: [number, number] = [168.69, -45.02];
export const MAP_ZOOM = 10.6;

/** Per-mode cinematic camera move — "the map changes intelligently". */
export const MODE_CAMERA: Record<
  DeckMode,
  { bearing: number; pitch: number; zoom: number }
> = {
  // look east toward the morning horizon
  sunrise: { bearing: 62, pitch: 42, zoom: 10.8 },
  // look west toward the setting sun
  sunset: { bearing: -102, pitch: 42, zoom: 10.7 },
  // top-down for stargazing / light-pollution survey
  night: { bearing: 0, pitch: 0, zoom: 10.4 },
};

/** Location markers anchored to real coordinates, surfaced per observation mode. */
export interface SkyMarker {
  id: string;
  /** geographic coordinate [lng, lat] */
  lng: number;
  lat: number;
  mode: DeckMode;
  name: string;
}

export const MARKERS: SkyMarker[] = [
  { id: "m1", lng: 168.86, lat: -44.98, mode: "sunrise", name: "Aurelia Ridge" },
  { id: "m2", lng: 168.92, lat: -45.09, mode: "sunrise", name: "Eastcliff Bluff" },
  { id: "m3", lng: 168.51, lat: -45.06, mode: "sunset", name: "Cape Lumen" },
  { id: "m4", lng: 168.57, lat: -44.94, mode: "sunset", name: "Vesper Point" },
  { id: "m5", lng: 168.72, lat: -45.13, mode: "sunset", name: "Halcyon Bay" },
  { id: "m6", lng: 168.81, lat: -44.91, mode: "night", name: "Obsidian Flats" },
  { id: "m7", lng: 168.61, lat: -45.14, mode: "night", name: "Stellar Basin" },
];

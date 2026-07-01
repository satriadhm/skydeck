export type DeckMode = "sunrise" | "sunset" | "night";

export type StatusLevel = "exceptional" | "excellent" | "good" | "average";

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
    condition: "Sunrise Conditions",
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
    condition: "Sunset Conditions",
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
    condition: "Stargazing Conditions",
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
 * Neutral starting position for the globe intro, used only until the visitor's
 * location resolves. Resolution is: a persisted last location (returning
 * visitor), else a permission-free IP lookup. Precise GPS is **opt-in** — the
 * app never auto-prompts; the visitor taps "Use precise location". No region is
 * special-cased — the feed centres on wherever the visitor is.
 */
export const MAP_CENTER: [number, number] = [0, 20];

/** Placeholder region name shown until the visitor's location resolves. */
export const LOCATION_NAME = "Locating…";

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

/**
 * Location markers anchored to real coordinates, surfaced per observation mode.
 * All copy below is authored sample content (not a live forecast feed): each
 * spot carries its own ranking, timing, and "what to expect in the sky".
 */
export interface SkyMarker {
  id: string;
  /** geographic coordinate [lng, lat] */
  lng: number;
  lat: number;
  mode: DeckMode;
  name: string;
  /** quality tier — drives ranking + theming (no longer shown as a label) */
  status: StatusLevel;
  /** 0–100 quality score — drives deterministic list order */
  score: number;
  /** one-line summary for the Best Places list */
  tagline: string;
  /** prose describing the actual sky phenomenon at this spot */
  whatToExpect: string;
  /** concrete timing window */
  bestWindow: string;
  /** which way you look */
  facing?: string;
  elevation?: string;
  access?: string;
  /** per-spot overrides of the mode-default atmospheric readout */
  metrics?: Partial<AtmosphericReadout>;
  /** spot-specific points that replace the generic mode layers */
  highlights?: string[];
  /** true for live OSM-discovered spots (vs the curated authored set) */
  discovered?: boolean;
  /** OSM feature class for discovered spots: viewpoint | peak | volcano */
  kind?: string;
}

/**
 * No curated spots — Sky Deck is fully location-based. The map fills entirely
 * from live OSM discovery around the visitor's detected location.
 */
export const MARKERS: SkyMarker[] = [];

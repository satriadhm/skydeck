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
 * Map home position — the Bromo–Tengger–Semeru caldera, East Java, Indonesia:
 * active volcanic cones rising from the Sea of Sand (Lautan Pasir), steep
 * crater walls, and high-altitude dark skies that suit the
 * sunrise / sunset / night themes.
 */
export const MAP_CENTER: [number, number] = [112.953, -7.942];
export const MAP_ZOOM = 10.6;

/** Human-readable name of the home region, shown in the nav. */
export const LOCATION_NAME = "Mount Bromo";

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
  /** quality tier, reused by StatusIndicator */
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

export const MARKERS: SkyMarker[] = [
  {
    id: "m1",
    lng: 112.92,
    lat: -7.908,
    mode: "sunrise",
    name: "Penanjakan",
    status: "exceptional",
    score: 95,
    tagline: "The classic high overlook of the whole caldera",
    whatToExpect:
      "From the highest rim the entire Tengger caldera opens beneath you. As first light breaks, Bromo's smoking cone and the near-perfect pyramid of Batok turn molten gold while Semeru puffs on the horizon — all of it floating above a sea of cloud pooled on the crater floor.",
    bestWindow: "04:50–05:20, about 20 min before first light",
    facing: "Southeast over the caldera",
    elevation: "2,770 m",
    access: "Jeep, then a short paved walk",
    metrics: { cloudCover: "Clear", visibility: "Vast", condition: "Sunrise Conditions" },
    highlights: [
      "Panoramic caldera overlook",
      "Sea of cloud on the crater floor",
      "Bromo, Batok and Semeru in one frame",
    ],
  },
  {
    id: "m2",
    lng: 112.985,
    lat: -7.915,
    mode: "sunrise",
    name: "Seruni Point",
    status: "excellent",
    score: 88,
    tagline: "A closer, lower balcony onto the Sea of Sand",
    whatToExpect:
      "A lower, closer balcony onto the caldera. The sun crests the eastern ridge and rakes low across the Sea of Sand, lighting Bromo's ash plume from behind and burning off the morning mist in slow ribbons.",
    bestWindow: "05:00–05:30, as the caldera fills with gold",
    facing: "East toward Bromo",
    elevation: "2,400 m",
    access: "Jeep to the viewpoint",
    highlights: [
      "Closer, lower caldera angle",
      "Backlit ash plume at first light",
      "Mist burning off the Sea of Sand",
    ],
  },
  {
    id: "m3",
    lng: 112.985,
    lat: -7.975,
    mode: "sunset",
    name: "Bukit Teletubbies",
    status: "excellent",
    score: 89,
    tagline: "Rolling green savanna rimmed in gold at dusk",
    whatToExpect:
      "The rolling green Savana catches the last warm light, every hill rimmed in gold while the shadows stretch long across the grass. Behind you the volcanic cones go violet as the sky deepens to amber.",
    bestWindow: "17:10–17:40, last light on the hills",
    facing: "West across the savanna",
    elevation: "2,300 m",
    access: "Jeep across the sand",
    highlights: [
      "Golden light on the savanna hills",
      "Long shadows across the grass",
      "Cones turning violet at dusk",
    ],
  },
  {
    id: "m4",
    lng: 112.935,
    lat: -7.965,
    mode: "sunset",
    name: "Pasir Berbisik",
    status: "good",
    score: 82,
    tagline: "Whispering Sands aglow with drifting ash",
    whatToExpect:
      "On the Whispering Sands the low sun sets the fine ash aglow and throws Batok's long shadow clear across the plain. Wind lifts thin veils of dust that catch fire in the last light.",
    bestWindow: "17:00–17:35, golden dust at low sun",
    facing: "West, open ash plain",
    elevation: "2,100 m",
    access: "Jeep; soft ash underfoot",
    metrics: { humidity: "Dusty", visibility: "Hazy" },
    highlights: [
      "Glowing volcanic ash plain",
      "Batok's long shadow at sunset",
      "Dust veils catching the last light",
    ],
  },
  {
    id: "m5",
    lng: 112.908,
    lat: -7.945,
    mode: "sunset",
    name: "Widodaren Ridge",
    status: "exceptional",
    score: 92,
    tagline: "Western rim with alpenglow on the cones",
    whatToExpect:
      "Perched on the western rim you watch the sun drop behind the Tengger wall. Alpenglow climbs the far faces of Bromo and Batok, holding a deep rose on the cones for minutes after the valley has gone to shadow.",
    bestWindow: "17:15–17:45, alpenglow after the sun drops",
    facing: "West over the Tengger rim",
    elevation: "2,600 m",
    access: "Jeep, then a short ridge hike",
    highlights: [
      "Western rim vantage",
      "Alpenglow on Bromo and Batok",
      "Late rose light after valley shadow",
    ],
  },
  {
    id: "m6",
    lng: 112.95,
    lat: -7.938,
    mode: "night",
    name: "Lautan Pasir",
    status: "exceptional",
    score: 90,
    tagline: "Milky Way core straight over the vent",
    whatToExpect:
      "Out on the caldera floor the light pollution falls away and the Milky Way core arches straight over Bromo's glowing vent. On clear nights the band is bright enough to throw the cones into silhouette.",
    bestWindow: "From 20:00; galactic core highest near 02:00",
    facing: "Open 360°",
    elevation: "2,100 m",
    access: "Jeep onto the caldera floor",
    metrics: { cloudCover: "Clear", humidity: "Cold", condition: "Stargazing Conditions" },
    highlights: [
      "Milky Way core over the vent",
      "Minimal light pollution",
      "Cones in silhouette on clear nights",
    ],
  },
  {
    id: "m7",
    lng: 112.965,
    lat: -7.958,
    mode: "night",
    name: "Mentigen Hill",
    status: "good",
    score: 78,
    tagline: "Quiet hill with a wide southern sky",
    whatToExpect:
      "A quiet rise with a wide, unobstructed southern sky. The galactic arch climbs out of the haze after moonset and wheels overhead, making this an ideal perch for long-exposure astrophotography.",
    bestWindow: "From 21:00; best after moonset",
    facing: "South over open sky",
    elevation: "2,350 m",
    access: "Short hike from the rim",
    metrics: { cloudCover: "Some Haze" },
    highlights: [
      "Wide, unobstructed southern sky",
      "Galactic arch after moonset",
      "Prime astrophotography hill",
    ],
  },
];

/** Active-mode markers, ranked best-first (deterministic, score-driven). */
export function placesForMode(mode: DeckMode): SkyMarker[] {
  return MARKERS.filter((m) => m.mode === mode).sort((a, b) => b.score - a.score);
}

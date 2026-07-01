/**
 * SSR-safe persistence of the visitor's last location and mode, so returning
 * users skip the cold start (IP lookup + mid-ocean neutral center) and land back
 * where they left off. The selected *date* is deliberately not persisted — it
 * should reset to "today" on each visit.
 */

import { type DeckMode } from "./skyData";

export interface SkyPrefs {
  /** [lng, lat] */
  center: [number, number];
  name: string;
  mode: DeckMode;
}

const KEY = "skydeck:prefs:v1";
const MODES: DeckMode[] = ["sunrise", "sunset", "night"];

/** Read stored prefs, or null if absent/unavailable/malformed. */
export function loadPrefs(): SkyPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<SkyPrefs>;
    const c = p.center;
    if (
      !Array.isArray(c) ||
      c.length !== 2 ||
      !Number.isFinite(c[0]) ||
      !Number.isFinite(c[1])
    ) {
      return null;
    }
    return {
      center: [c[0], c[1]],
      name: typeof p.name === "string" && p.name ? p.name : "Your location",
      mode: p.mode && MODES.includes(p.mode) ? p.mode : "sunset",
    };
  } catch {
    return null;
  }
}

/** Merge a partial update into stored prefs (no-op on the server). */
export function savePrefs(patch: Partial<SkyPrefs>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadPrefs();
    const next = { ...(current ?? {}), ...patch };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode / quota) — persistence is best-effort
  }
}

/** Small date helpers for the day switcher + historical/forecast fetch. */

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Local "YYYY-MM-DD" (what Open-Meteo's start_date/end_date expect). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** How far back/forward the day switcher allows (Open-Meteo serves both). */
export const PAST_DAYS = 60;
export const FUTURE_DAYS = 14;

export function clampDate(d: Date, min: Date, max: Date): Date {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

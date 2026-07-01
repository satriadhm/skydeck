/**
 * Precise GPS location, opt-in only.
 *
 * We never auto-prompt on load: in-app browsers (Telegram/WhatsApp/IG) block or
 * silently stall the Geolocation permission, so the app defaults to a keyless IP
 * lookup and offers this as an explicit "Use precise location" action.
 */

/** Resolve to [lng, lat] from the device GPS, or reject on denial/timeout. */
export function getPreciseLocation(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

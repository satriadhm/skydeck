"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Warning modal shown when auto-locate can't determine the visitor's location
 * (the keyless IP lookup failed or was blocked), so the app is parked on the
 * neutral default. Nudges them to search a place manually.
 */
export default function LocationWarning({
  open,
  accent,
  onSearch,
  onDismiss,
}: {
  open: boolean;
  accent: string;
  /** open the place search */
  onSearch: () => void;
  /** dismiss and explore from the neutral default */
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="pointer-events-auto fixed inset-0 z-[60] bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
          />
          <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label="Location unavailable"
              className="fresnel glass-panel pointer-events-auto w-[min(400px,100%)] rounded-3xl p-5 text-center"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              <span
                className="mx-auto flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-white/20"
                style={{ background: `${accent}1f` }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"
                    stroke={accent}
                    strokeWidth="1.7"
                  />
                  <path
                    d="M12 7.5v3.5"
                    stroke={accent}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="13.4" r="0.9" fill={accent} />
                </svg>
              </span>

              <h2 className="mt-3 text-[16px] font-semibold tracking-tight text-white">
                Couldn’t find your location
              </h2>
              <p className="mx-auto mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-white/60">
                Automatic location is unavailable or blocked, so the map is on a
                neutral view. Search for a city or place to see its live sky
                conditions.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onSearch}
                  className="w-full rounded-full py-2.5 text-[13px] font-semibold tracking-tight text-[#05070d] transition-transform active:scale-[0.98]"
                  style={{ background: accent, boxShadow: `0 0 18px ${accent}66` }}
                >
                  Search a place
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="w-full rounded-full py-2 text-[12.5px] font-medium text-white/60 ring-1 ring-white/12 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                >
                  Explore anyway
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

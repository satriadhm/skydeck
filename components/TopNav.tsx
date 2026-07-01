"use client";

import { motion } from "framer-motion";
import { LOCATION_NAME } from "@/lib/skyData";

export default function TopNav({
  accent,
  label,
  location = LOCATION_NAME,
  onSearch,
  onUseLocation,
  locating = false,
}: {
  accent: string;
  label: string;
  location?: string;
  onSearch?: () => void;
  /** request precise GPS location (opt-in) */
  onUseLocation?: () => void;
  /** true while a precise-location request is in flight */
  locating?: boolean;
}) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="fresnel light-streak glass-panel relative z-30 mx-auto flex h-[60px] w-full max-w-[700px] items-center justify-between overflow-hidden rounded-full px-4 sm:h-[68px] sm:px-5"
    >
      {/* mode-colored wash + underglow — the nav takes on the active theme */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        animate={{
          background: `linear-gradient(120deg, ${accent}1f, transparent 55%, ${accent}14)`,
        }}
        transition={{ duration: 0.6 }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 bottom-0 h-[2px] rounded-full"
        animate={{ background: accent, boxShadow: `0 0 16px ${accent}` }}
        transition={{ duration: 0.6 }}
        style={{ opacity: 0.7 }}
      />

      {/* logo */}
      <div className="relative flex items-center gap-2.5">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/5 ring-1 ring-white/20">
          <motion.span
            className="h-3.5 w-3.5 rounded-full"
            animate={{ background: accent, boxShadow: `0 0 10px ${accent}99` }}
            transition={{ duration: 0.6 }}
          />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">
          Sky&nbsp;Deck
        </span>
      </div>

      {/* live mode + location context */}
      <div className="relative hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] sm:flex">
        <motion.span
          animate={{ color: accent }}
          transition={{ duration: 0.5 }}
        >
          {label}
        </motion.span>
        <span className="text-white/30">·</span>
        <span className="max-w-[200px] truncate text-white/60">{location}</span>
      </div>

      {/* right cluster */}
      <div className="relative flex items-center gap-1.5">
        {onUseLocation && (
          <button
            type="button"
            onClick={onUseLocation}
            aria-label="Use precise location"
            aria-busy={locating}
            className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-white/15 transition-all duration-200 hover:bg-white/10 hover:ring-white/30"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className={locating ? "animate-pulse" : undefined}
            >
              <circle cx="12" cy="12" r="3.2" stroke="white" strokeWidth="1.8" />
              <path
                d="M12 2v3M12 19v3M22 12h-3M5 12H2"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.4" opacity="0.5" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onSearch}
          aria-label="Search places"
          className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-white/15 transition-all duration-200 hover:bg-white/10 hover:ring-white/30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="1.8" />
            <path
              d="m20 20-3.2-3.2"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </motion.nav>
  );
}

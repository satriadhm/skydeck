"use client";

import { motion } from "framer-motion";

const LINKS = ["Explore", "Forecasts", "Collections", "Community"];

export default function TopNav({ accent }: { accent: string }) {
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

      {/* center links */}
      <div className="relative hidden items-center gap-1 md:flex">
        {LINKS.map((l, i) => (
          <button
            key={l}
            className="rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 hover:bg-white/10"
            style={{
              color: i === 0 ? accent : "rgba(255,255,255,0.65)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* right cluster */}
      <div className="relative flex items-center gap-2">
        <button
          aria-label="Search"
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
        <button
          aria-label="Profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition-all duration-200 hover:bg-white/15 hover:ring-white/30"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white/70"
          >
            <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M5.5 19a6.5 6.5 0 0 1 13 0"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </motion.nav>
  );
}

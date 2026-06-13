"use client";

import { motion } from "framer-motion";

const LINKS = ["Explore", "Forecasts", "Collections", "Community"];

export default function TopNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="fresnel light-streak glass-panel relative z-30 mx-auto flex h-[68px] w-full max-w-[700px] items-center justify-between rounded-full px-5"
    >
      {/* logo */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-white/30 to-white/5 ring-1 ring-white/25">
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{
              background:
                "conic-gradient(from 210deg, #FFD76A, #FF8E5D, #7FA8FF, #FFD76A)",
              boxShadow: "0 0 10px rgba(255,210,120,0.5)",
            }}
          />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">
          Sky&nbsp;Deck
        </span>
      </div>

      {/* center links */}
      <div className="hidden items-center gap-1 md:flex">
        {LINKS.map((l, i) => (
          <button
            key={l}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 hover:bg-white/10 ${
              i === 0 ? "text-white" : "text-white/65 hover:text-white"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* right cluster */}
      <div className="flex items-center gap-2">
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
          className="h-9 w-9 rounded-full bg-gradient-to-br from-[#FF8E5D] via-[#FF5FA0] to-[#7FA8FF] ring-1 ring-white/30 transition-transform duration-200 hover:scale-105"
        />
      </div>
    </motion.nav>
  );
}

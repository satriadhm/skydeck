"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type DeckMode } from "@/lib/skyData";

/**
 * A flat, per-mode illustrated sky scene that swaps when the observation mode
 * changes. No fabricated numbers — just a clear visual read of the mode.
 *
 * Fluid by default: the SVG scales to its container's width and keeps its
 * 300:168 aspect ratio, so callers control the size with width utilities.
 *
 * Pass `cover` to make it fill its parent edge-to-edge (cropping instead of
 * letterboxing) — used as the full-bleed background of the bottom dock.
 */
export default function SkyScene({
  mode,
  className,
  cover = false,
}: {
  mode: DeckMode;
  className?: string;
  cover?: boolean;
}) {
  return (
    <div className={`${cover ? "absolute inset-0" : "relative"} ${className ?? ""}`}>
      <AnimatePresence mode="wait">
        <motion.svg
          key={mode}
          viewBox="0 0 300 168"
          preserveAspectRatio={cover ? "xMidYMid slice" : "xMidYMid meet"}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          role="img"
          aria-label={`${mode} sky illustration`}
          className={cover ? "absolute inset-0 h-full w-full" : "block h-auto w-full"}
        >
          {mode === "sunrise" && <Sunrise />}
          {mode === "sunset" && <Sunset />}
          {mode === "night" && <Night />}
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}

/* Shared, smoothly curved mountain silhouettes (two layers for depth). */
function Mountains({ back, front }: { back: string; front: string }) {
  return (
    <>
      <path
        d="M0 116 C36 104 64 95 98 103 C124 109 139 82 167 91 C199 101 233 87 268 103 C284 110 294 110 300 107 L300 168 L0 168 Z"
        fill={back}
      />
      <path
        d="M0 142 C38 131 69 122 109 132 C141 140 165 114 199 127 C235 141 269 131 300 139 L300 168 L0 168 Z"
        fill={front}
      />
    </>
  );
}

function Sunrise() {
  return (
    <g>
      <defs>
        <linearGradient id="sr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e2747" />
          <stop offset="46%" stopColor="#7e5a7e" />
          <stop offset="78%" stopColor="#e0866a" />
          <stop offset="100%" stopColor="#ffd28c" />
        </linearGradient>
        <radialGradient id="sr-glow" cx="50%" cy="78%" r="62%">
          <stop offset="0%" stopColor="#FFE6B0" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFE6B0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="168" fill="url(#sr-sky)" />
      {/* rising sun + soft halo, partly behind the front range */}
      <circle cx="150" cy="120" r="60" fill="url(#sr-glow)" />
      <circle cx="150" cy="118" r="24" fill="#FFDD86" />
      <Mountains back="#3a2c3e" front="#241a2a" />
    </g>
  );
}

function Sunset() {
  return (
    <g>
      <defs>
        <linearGradient id="ss-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241a3e" />
          <stop offset="48%" stopColor="#ff6f9c" />
          <stop offset="80%" stopColor="#ff8e63" />
          <stop offset="100%" stopColor="#ffb877" />
        </linearGradient>
        <radialGradient id="ss-glow" cx="50%" cy="84%" r="64%">
          <stop offset="0%" stopColor="#FFD2A6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFD2A6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="168" fill="url(#ss-sky)" />
      {/* large, low setting sun dipping behind the range */}
      <circle cx="150" cy="128" r="70" fill="url(#ss-glow)" />
      <circle cx="150" cy="126" r="30" fill="#FFC07A" />
      <Mountains back="#3b2238" front="#221426" />
    </g>
  );
}

function Night() {
  return (
    <g>
      <defs>
        <linearGradient id="nt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#05080f" />
          <stop offset="55%" stopColor="#0f1b3a" />
          <stop offset="100%" stopColor="#1d2f5c" />
        </linearGradient>
        <radialGradient id="nt-moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#EAF0FF" />
          <stop offset="100%" stopColor="#B9C6F2" />
        </radialGradient>
      </defs>
      <rect width="300" height="168" fill="url(#nt-sky)" />
      {/* stars */}
      <g fill="#DCE4FF">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
      </g>
      {/* crescent moon */}
      <path
        d="M228 30 a20 20 0 1 0 0 40 a14 14 0 1 1 0 -40 Z"
        fill="url(#nt-moon)"
      />
      <Mountains back="#16203f" front="#0b1226" />
    </g>
  );
}

const STARS = [
  { x: 40, y: 30, r: 1.4, o: 0.9 },
  { x: 70, y: 60, r: 1, o: 0.6 },
  { x: 110, y: 24, r: 1.6, o: 0.95 },
  { x: 150, y: 48, r: 1, o: 0.7 },
  { x: 96, y: 80, r: 1.2, o: 0.55 },
  { x: 180, y: 70, r: 1, o: 0.6 },
  { x: 260, y: 92, r: 1.3, o: 0.8 },
  { x: 286, y: 40, r: 1, o: 0.65 },
  { x: 200, y: 30, r: 1.2, o: 0.85 },
  { x: 56, y: 96, r: 1, o: 0.5 },
];

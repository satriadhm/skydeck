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

/* Shared layered mountain silhouettes. */
function Mountains({ back, front }: { back: string; front: string }) {
  return (
    <>
      <path
        d="M0 118 L52 80 L104 110 L150 72 L200 104 L256 76 L300 116 L300 168 L0 168 Z"
        fill={back}
      />
      <path
        d="M0 140 L48 112 L100 134 L150 108 L204 138 L258 112 L300 140 L300 168 L0 168 Z"
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
          <stop offset="0%" stopColor="#1d2746" />
          <stop offset="58%" stopColor="#9b5e57" />
          <stop offset="100%" stopColor="#FFCE7A" />
        </linearGradient>
        <radialGradient id="sr-glow" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="#FFE3A8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFE3A8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="168" rx="20" fill="url(#sr-sky)" />
      <rect width="300" height="168" rx="20" fill="url(#sr-glow)" opacity="0.7" />
      {/* rising sun, partly behind the front range */}
      <circle cx="150" cy="116" r="26" fill="#FFD76A" />
      <g stroke="#FFE3A8" strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
        <line x1="150" y1="74" x2="150" y2="62" />
        <line x1="116" y1="92" x2="108" y2="84" />
        <line x1="184" y1="92" x2="192" y2="84" />
      </g>
      <Mountains back="#3a2c3e" front="#241a2a" />
    </g>
  );
}

function Sunset() {
  return (
    <g>
      <defs>
        <linearGradient id="ss-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1c3e" />
          <stop offset="52%" stopColor="#FF5FA0" />
          <stop offset="100%" stopColor="#FF9A5B" />
        </linearGradient>
        <radialGradient id="ss-glow" cx="50%" cy="92%" r="70%">
          <stop offset="0%" stopColor="#FFC9A0" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFC9A0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="168" rx="20" fill="url(#ss-sky)" />
      <rect width="300" height="168" rx="20" fill="url(#ss-glow)" opacity="0.8" />
      {/* large, low setting sun dipping behind the range */}
      <circle cx="150" cy="128" r="32" fill="#FFB36A" />
      <Mountains back="#3b2238" front="#221426" />
    </g>
  );
}

function Night() {
  return (
    <g>
      <defs>
        <linearGradient id="nt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060914" />
          <stop offset="60%" stopColor="#111d3c" />
          <stop offset="100%" stopColor="#1c2c57" />
        </linearGradient>
      </defs>
      <rect width="300" height="168" rx="20" fill="url(#nt-sky)" />
      {/* crescent moon */}
      <path
        d="M228 30 a20 20 0 1 0 0 40 a14 14 0 1 1 0 -40 Z"
        fill="#CBD6FF"
      />
      {/* stars */}
      <g fill="#DCE4FF">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
      </g>
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

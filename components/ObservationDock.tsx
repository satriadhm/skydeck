"use client";

import { motion } from "framer-motion";
import { DECK_TABS, type DeckMode, type DeckTab } from "@/lib/skyData";
import StatusIndicator from "./StatusIndicator";

export default function ObservationDock({
  mode,
  onChange,
}: {
  mode: DeckMode;
  onChange: (m: DeckMode) => void;
}) {
  const active = DECK_TABS.find((t) => t.mode === mode)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="relative z-30"
    >
      {/* ambient glow cast by the active theme, behind the dock */}
      <motion.div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-[60px]"
        animate={{
          background: `radial-gradient(60% 80% at 50% 60%, ${active.glow} 0%, transparent 70%)`,
        }}
        transition={{ duration: 0.6 }}
        style={{ filter: "blur(20px)", opacity: 0.7 }}
      />

      <div
        className="fresnel light-streak animate-streak glass-dock relative grid grid-cols-3 gap-1 overflow-hidden rounded-[40px] p-2"
        style={{ width: "min(620px, 92vw)", height: 104 }}
      >
        {DECK_TABS.map((tab) => (
          <DockSection
            key={tab.mode}
            tab={tab}
            isActive={tab.mode === mode}
            onSelect={() => onChange(tab.mode)}
          />
        ))}
      </div>
    </motion.div>
  );
}

function DockSection({
  tab,
  isActive,
  onSelect,
}: {
  tab: DeckTab;
  isActive: boolean;
  onSelect: () => void;
}) {
  const shimmer =
    tab.mode === "sunrise"
      ? "sunShimmer 6s ease-in-out infinite"
      : tab.mode === "sunset"
        ? undefined
        : "twinkle 4s ease-in-out infinite";

  return (
    <motion.button
      onClick={onSelect}
      initial={false}
      animate={{
        scale: isActive ? 1.03 : 1,
        y: isActive ? -4 : 0,
      }}
      whileHover={{ scale: isActive ? 1.03 : 1.015 }}
      transition={{ type: "spring", stiffness: 340, damping: 24, mass: 0.7 }}
      className="group relative flex flex-col items-center justify-center gap-1 rounded-[32px] px-2 transition-colors duration-250"
      style={{
        background: isActive
          ? `linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))`
          : "transparent",
        boxShadow: isActive
          ? `inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px ${tab.glow}`
          : "none",
        border: isActive
          ? "1px solid rgba(255,255,255,0.28)"
          : "1px solid transparent",
      }}
    >
      {/* per-tab atmospheric wash */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[32px] transition-opacity duration-300"
        style={{
          opacity: isActive ? 0.5 : 0,
          background:
            tab.mode === "sunset"
              ? `linear-gradient(110deg, ${tab.palette[0]}33, ${tab.palette[2]}33)`
              : `radial-gradient(70% 90% at 50% 30%, ${tab.palette[0]}30, transparent 70%)`,
          backgroundSize: tab.mode === "sunset" ? "200% 100%" : "auto",
          animation:
            tab.mode === "sunset" && isActive
              ? "horizonShift 8s ease-in-out infinite alternate"
              : undefined,
        }}
      />

      <div className="relative flex items-center gap-1.5">
        <span
          className="text-[17px] leading-none"
          style={{ animation: isActive ? shimmer : undefined }}
        >
          {tab.icon}
        </span>
        <span
          className={`text-[13px] font-medium tracking-tight transition-colors ${
            isActive ? "text-white" : "text-white/60 group-hover:text-white/80"
          }`}
        >
          {tab.label}
        </span>
      </div>

      <span
        className="relative text-[26px] font-bold leading-none tracking-tight tabular-nums transition-all"
        style={{
          color: isActive ? "#fff" : "rgba(255,255,255,0.78)",
          textShadow: isActive ? `0 0 22px ${tab.glow}` : "none",
        }}
      >
        {tab.score}
      </span>

      <div className="relative">
        <StatusIndicator status={tab.status} />
      </div>
    </motion.button>
  );
}

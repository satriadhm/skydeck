"use client";

import { motion } from "framer-motion";
import {
  DECK_TABS,
  type DeckMode,
  type DeckTab,
  type StatusLevel,
} from "@/lib/skyData";
import StatusIndicator from "./StatusIndicator";
import SkyScene from "./SkyScene";

export default function ObservationDock({
  mode,
  statusForMode,
  onChange,
}: {
  mode: DeckMode;
  /** live quality tier per mode; falls back to the tab's authored status */
  statusForMode?: (m: DeckMode) => StatusLevel;
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
        className="fresnel light-streak glass-dock relative overflow-hidden rounded-[40px]"
        style={{ width: "min(620px, 92vw)", height: 104 }}
      >
        {/* full-cover sky scene background (cross-fades on mode change) */}
        <SkyScene mode={mode} cover />
        {/* scrim so tab labels + status dots stay legible over the scene */}
        <div className="pointer-events-none absolute inset-0 bg-black/30" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25" />

        {/* the three mode tabs, layered on top */}
        <div className="relative z-10 grid h-full grid-cols-3 gap-1 p-2">
          {DECK_TABS.map((tab) => (
            <DockSection
              key={tab.mode}
              tab={tab}
              status={statusForMode?.(tab.mode) ?? tab.status}
              isActive={tab.mode === mode}
              onSelect={() => onChange(tab.mode)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function DockSection({
  tab,
  status,
  isActive,
  onSelect,
}: {
  tab: DeckTab;
  status: StatusLevel;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col items-center justify-center gap-1.5 rounded-[26px] outline-none transition-colors duration-200 ${
        isActive ? "" : "hover:bg-white/[0.06]"
      }`}
    >
      {/* one shared frosted highlight that glides to the active tab */}
      {isActive && (
        <motion.span
          layoutId="dockActive"
          aria-hidden
          className="absolute inset-0 rounded-[26px] ring-1 ring-white/25"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 18px rgba(0,0,0,0.25)",
          }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      <span
        className={`relative text-[14px] font-medium tracking-tight transition-colors duration-200 ${
          isActive ? "text-white" : "text-white/70 group-hover:text-white"
        }`}
      >
        {tab.label}
      </span>

      <div className="relative">
        <StatusIndicator status={status} />
      </div>
    </button>
  );
}

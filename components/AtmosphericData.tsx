"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ATMOSPHERIC, DECK_TABS, type DeckMode } from "@/lib/skyData";
import SkyScene from "./SkyScene";

export default function AtmosphericData({ mode }: { mode: DeckMode }) {
  const data = ATMOSPHERIC[mode];
  const tab = DECK_TABS.find((t) => t.mode === mode)!;
  const accent = tab.accent;

  const metrics = [
    { label: "Cloud Cover", value: data.cloudCover },
    { label: "Humidity", value: data.humidity },
    { label: "Moon Phase", value: data.moonPhase },
    { label: "Visibility", value: data.visibility },
  ];

  return (
    <div className="relative z-20 mx-auto flex flex-col items-center">
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6 }}
        className="text-[12px] font-medium uppercase tracking-[0.28em] text-white/55"
      >
        {tab.label} · Lake Wakatipu
      </motion.p>

      {/* per-mode illustrated scene replaces the old numeric score */}
      <div className="relative mt-3 w-[min(300px,72vw)] sm:w-[300px]">
        <motion.div
          aria-hidden
          className="absolute -inset-6 -z-10 rounded-[40px]"
          animate={{
            background: `radial-gradient(60% 70% at 50% 55%, ${accent}33 0%, transparent 70%)`,
          }}
          transition={{ duration: 0.6 }}
          style={{ filter: "blur(18px)" }}
        />
        <div className="overflow-hidden rounded-[22px] ring-1 ring-white/12 shadow-[0_24px_60px_rgba(0,0,0,0.34)]">
          <SkyScene mode={mode} />
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.p
          key={data.condition}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-4 text-[15px] font-medium text-white/80"
        >
          {data.condition}
        </motion.p>
      </AnimatePresence>

      {/* secondary metric cards — qualitative, not fabricated precision */}
      <div className="mt-5 grid w-[min(300px,82vw)] grid-cols-2 gap-2.5 sm:mt-6 sm:w-auto sm:grid-cols-4 sm:gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.07, duration: 0.5 }}
            className="fresnel light-streak glass-panel relative flex w-full flex-col rounded-2xl px-3 py-2.5 sm:w-[128px] sm:px-4 sm:py-3"
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              {m.label}
            </span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={m.value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="mt-1 text-[16px] font-semibold tracking-tight text-white"
              >
                {m.value}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

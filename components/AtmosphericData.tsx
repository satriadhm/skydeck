"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ATMOSPHERIC,
  DECK_TABS,
  type DeckMode,
} from "@/lib/skyData";

export default function AtmosphericData({ mode }: { mode: DeckMode }) {
  const data = ATMOSPHERIC[mode];
  const accent = DECK_TABS.find((t) => t.mode === mode)!.accent;

  const metrics = [
    { label: "Cloud Cover", value: data.cloudCover },
    { label: "Humidity", value: data.humidity },
    { label: "Moon Phase", value: data.moonPhase },
    { label: "Visibility", value: data.visibility },
  ];

  return (
    <div className="relative z-20 flex flex-col items-center">
      {/* hero quality readout */}
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6 }}
        className="text-[12px] font-medium uppercase tracking-[0.28em] text-white/55"
      >
        Tonight&rsquo;s Sky Quality
      </motion.p>

      <div className="relative mt-1 flex items-start">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={data.skyQuality}
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="block text-[92px] font-bold leading-none tracking-tight"
            style={{
              textShadow: `0 0 50px ${accent}55`,
              backgroundImage: `linear-gradient(180deg, #fff 30%, ${accent})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {data.skyQuality}
          </motion.span>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.p
          key={data.condition}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-1 text-[15px] font-medium text-white/80"
        >
          {data.condition}
        </motion.p>
      </AnimatePresence>

      {/* secondary metric cards */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.07, duration: 0.5 }}
            className="fresnel light-streak glass-panel relative flex w-[128px] flex-col rounded-2xl px-4 py-3"
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
                className="mt-1 text-[18px] font-semibold tracking-tight text-white"
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

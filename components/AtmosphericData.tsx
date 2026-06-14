"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ATMOSPHERIC, DECK_TABS, type DeckMode } from "@/lib/skyData";
import SkyScene from "./SkyScene";

export default function AtmosphericData({ mode }: { mode: DeckMode }) {
  const data = ATMOSPHERIC[mode];
  const tab = DECK_TABS.find((t) => t.mode === mode)!;
  const accent = tab.accent;

  return (
    <div className="relative z-20 mx-auto flex flex-col items-center">
      {/* per-mode illustrated scene replaces the old numeric score */}
      <div className="relative w-[min(300px,72vw)] sm:w-[300px]">
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
    </div>
  );
}

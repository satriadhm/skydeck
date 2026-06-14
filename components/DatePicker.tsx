"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDays,
  clampDate,
  FUTURE_DAYS,
  isSameDay,
  PAST_DAYS,
  startOfDay,
} from "@/lib/dateUtils";

/**
 * Minimalist day switcher: a glass pill with ‹ › day steps and a compact
 * month-grid popover. Bounded to the range Open-Meteo serves (recent past →
 * near-future), so the map's best spots can be browsed across days.
 */
export default function DatePicker({
  date,
  accent,
  onChange,
}: {
  date: Date;
  accent: string;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const min = useMemo(() => addDays(today, -PAST_DAYS), [today]);
  const max = useMemo(() => addDays(today, FUTURE_DAYS), [today]);

  const canPrev = date > min;
  const canNext = date < max;
  const step = (n: number) => onChange(clampDate(addDays(date, n), min, max));

  const label = isSameDay(date, today)
    ? "Today"
    : date.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

  return (
    <div className="pointer-events-auto relative">
      <div className="fresnel glass-panel flex items-center gap-0.5 rounded-full p-1">
        <StepButton dir="prev" disabled={!canPrev} onClick={() => step(-1)} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors hover:bg-white/10"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="4.5" width="18" height="16" rx="3" stroke="white" strokeWidth="1.7" opacity="0.65" />
            <path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="white" strokeWidth="1.7" strokeLinecap="round" opacity="0.65" />
          </svg>
          <span className="min-w-[58px] text-center text-[12.5px] font-semibold tracking-tight text-white">
            {label}
          </span>
        </button>
        <StepButton dir="next" disabled={!canNext} onClick={() => step(1)} />
      </div>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              // centre via framer's x so its transform doesn't clobber a
              // Tailwind -translate-x-1/2 (which would shove the popover aside)
              initial={{ opacity: 0, y: -6, scale: 0.98, x: "-50%" }}
              animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, y: -6, scale: 0.98, x: "-50%" }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="fresnel glass-panel absolute left-1/2 top-[calc(100%+8px)] z-50 w-[260px] rounded-3xl p-3"
            >
              <Month
                date={date}
                today={today}
                min={min}
                max={max}
                accent={accent}
                onPick={(d) => {
                  onChange(d);
                  setOpen(false);
                }}
              />
              {!isSameDay(date, today) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(today);
                    setOpen(false);
                  }}
                  className="mt-2 w-full rounded-xl bg-white/[0.06] py-1.5 text-[12px] font-medium text-white/75 ring-1 ring-white/10 transition-colors hover:bg-white/10"
                >
                  Jump to today
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous day" : "Next day"}
      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors enabled:hover:bg-white/10 disabled:opacity-25"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path
          d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
          stroke="white"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function Month({
  date,
  today,
  min,
  max,
  accent,
  onPick,
}: {
  date: Date;
  today: Date;
  min: Date;
  max: Date;
  accent: string;
  onPick: (d: Date) => void;
}) {
  const [view, setView] = useState(() => new Date(date.getFullYear(), date.getMonth(), 1));
  useEffect(() => {
    setView(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [date]);

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const lead = first.getDay();
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= count; d++) out.push(new Date(view.getFullYear(), view.getMonth(), d));
    return out;
  }, [view]);

  const shiftMonth = (n: number) =>
    setView(new Date(view.getFullYear(), view.getMonth() + n, 1));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="text-[12.5px] font-semibold tracking-tight text-white">
          {view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1 text-center text-[10px] font-medium text-white/35">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const disabled = d < min || d > max;
          const selected = isSameDay(d, date);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onPick(d)}
              className="flex h-8 items-center justify-center rounded-lg text-[12px] tabular-nums transition-colors disabled:opacity-20"
              style={{
                background: selected ? accent : "transparent",
                color: selected ? "#05070d" : "#fff",
                fontWeight: selected || isToday ? 700 : 400,
                boxShadow: !selected && isToday ? `inset 0 0 0 1px ${accent}88` : "none",
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

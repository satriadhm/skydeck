"use client";

import { useEffect, useReducer } from "react";
import { useMap } from "./MapContext";
import type { FieldPoint } from "./SkyDataProvider";

/**
 * Live "sky conditions" field — a faint lattice of dots over the region, each
 * coloured by current cloud cover (clear → teal, overcast → grey). Sits behind
 * the place markers so the map reads as a spatial snapshot of where the sky is
 * clearest right now.
 */
export default function ConditionsField({ field }: { field: FieldPoint[] }) {
  const map = useMap();

  // re-project on camera change so dots stay pinned to the terrain, coalescing
  // all move/zoom/rotate events within a frame into a single bump
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!map) return;
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        bump();
      });
    };
    map.on("move", schedule);
    map.on("zoom", schedule);
    map.on("rotate", schedule);
    bump();
    return () => {
      map.off("move", schedule);
      map.off("zoom", schedule);
      map.off("rotate", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [map]);

  if (!map || field.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{ mixBlendMode: "screen" }}
    >
      {field.map((p) => {
        const { x, y } = map.project([p.lng, p.lat]);
        const clarity = (100 - p.cloudCover) / 100; // 1 = clear
        return (
          <span
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: x,
              top: y,
              width: 10,
              height: 10,
              background: p.color,
              // clearer skies glow a little brighter / larger
              opacity: 0.18 + clarity * 0.4,
              boxShadow: `0 0 ${6 + clarity * 14}px ${p.color}`,
            }}
          />
        );
      })}
    </div>
  );
}

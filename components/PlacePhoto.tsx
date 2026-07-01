"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type DeckMode } from "@/lib/skyData";
import { fetchPlacePhoto, type SkyPhoto } from "@/lib/photos";
import SkyScene from "./SkyScene";

type State =
  | { status: "loading" }
  | { status: "photo"; photo: SkyPhoto }
  | { status: "none" };

/**
 * Hero image for the detail panel. Pulls a real nearby photo from Wikimedia
 * Commons (keyless) for the spot's coordinate; while loading or when none is
 * found, shows the illustrated SkyScene for the active mode. Keeps the fixed
 * 300:168 frame so the panel never reflows.
 */
export default function PlacePhoto({
  id,
  lat,
  lng,
  mode,
  name,
}: {
  /** marker id — refetches when the selected spot changes */
  id: string;
  lat: number;
  lng: number;
  mode: DeckMode;
  /** spot name — used to prefer a title-matching photo over the nearest one */
  name?: string;
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ status: "loading" });

    fetchPlacePhoto(lat, lng, controller.signal, undefined, name)
      .then((photo) => {
        if (cancelled) return;
        setState(photo ? { status: "photo", photo } : { status: "none" });
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          setState({ status: "none" });
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, lat, lng, name]);

  return (
    <div className="relative w-full" style={{ paddingBottom: "56%" }}>
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          {state.status === "photo" ? (
            <motion.div
              key={`photo-${state.photo.thumbUrl}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.photo.thumbUrl}
                alt={state.photo.title.replace(/^File:/, "").replace(/\.\w+$/, "")}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setState({ status: "none" })}
              />
              <Attribution photo={state.photo} />
            </motion.div>
          ) : (
            <motion.div
              key="scene"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              <SkyScene mode={mode} cover />
              {state.status === "loading" && (
                <div className="absolute inset-0 flex items-end p-2">
                  <span className="rounded-full bg-black/45 px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
                    Finding photo…
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Small CC attribution overlay (Commons licensing requires credit). */
function Attribution({ photo }: { photo: SkyPhoto }) {
  const credit = [photo.artist, photo.license].filter(Boolean).join(" · ");
  if (!credit) return null;
  return (
    <a
      href={photo.descUrl || undefined}
      target="_blank"
      rel="noreferrer noopener"
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-1.5 pt-5 text-[9.5px] leading-tight text-white/65 transition-colors hover:text-white/90"
    >
      <span className="line-clamp-1">📷 Nearby · {credit} · Wikimedia Commons</span>
    </a>
  );
}

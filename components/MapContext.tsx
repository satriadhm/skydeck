"use client";

import { createContext, useContext } from "react";
import type { Map as MlMap } from "maplibre-gl";

export const MapContext = createContext<MlMap | null>(null);

export const useMap = () => useContext(MapContext);

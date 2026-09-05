// Crop and soil parameter tables.
// Kc values and root depths follow FAO-56 (Allen et al., 1998) indicative
// values; yield-stress coefficients follow FAO-33 style production-function
// approximations. These are planning coefficients — documented in the app's
// Methodology page — not measured site data.

import type { GrowthStage } from "./types";

export interface CropParams {
  id: string;
  label: string;
  isPaddy: boolean; // paddy crops need near-saturated soil and drainage logic
  kc: { initial: number; mid: number; late: number };
  rootDepthM: { initial: number; mid: number };
  stageDays: { initial: number; development: number; mid: number; late: number };
  p: number; // depletion fraction at which stress begins (FAO-56 Table 22)
  yieldLossPerStressDay: number; // fraction of potential yield lost per stress-day
  notes: string;
}

export const CROPS: Record<string, CropParams> = {
  rice: {
    id: "rice",
    label: "Rice (paddy)",
    isPaddy: true,
    kc: { initial: 1.05, mid: 1.2, late: 0.9 },
    rootDepthM: { initial: 0.3, mid: 0.6 },
    stageDays: { initial: 30, development: 30, mid: 40, late: 30 },
    p: 0.25,
    yieldLossPerStressDay: 0.008,
    notes: "Paddy: model targets near saturation; drainage advisory under heavy rain.",
  },
  maize: {
    id: "maize",
    label: "Maize",
    isPaddy: false,
    kc: { initial: 0.3, mid: 1.2, late: 0.5 },
    rootDepthM: { initial: 0.3, mid: 1.2 },
    stageDays: { initial: 20, development: 35, mid: 40, late: 30 },
    p: 0.5,
    yieldLossPerStressDay: 0.012,
    notes: "Very sensitive to stress around flowering (mid stage).",
  },
  sugarcane: {
    id: "sugarcane",
    label: "Sugarcane",
    isPaddy: false,
    kc: { initial: 0.4, mid: 1.25, late: 0.75 },
    rootDepthM: { initial: 0.4, mid: 1.5 },
    stageDays: { initial: 30, development: 60, mid: 120, late: 60 },
    p: 0.55,
    yieldLossPerStressDay: 0.005,
    notes: "Deep rooted; long cycle.",
  },
  coffee: {
    id: "coffee",
    label: "Coffee",
    isPaddy: false,
    kc: { initial: 0.6, mid: 1.05, late: 0.85 },
    rootDepthM: { initial: 0.5, mid: 1.4 },
    stageDays: { initial: 40, development: 60, mid: 90, late: 60 },
    p: 0.5,
    yieldLossPerStressDay: 0.006,
    notes: "Perennial; shaded systems reduce ETc.",
  },
  vegetables: {
    id: "vegetables",
    label: "Vegetables (mixed)",
    isPaddy: false,
    kc: { initial: 0.4, mid: 1.0, late: 0.8 },
    rootDepthM: { initial: 0.2, mid: 0.6 },
    stageDays: { initial: 15, development: 25, mid: 30, late: 15 },
    p: 0.35,
    yieldLossPerStressDay: 0.015,
    notes: "Shallow roots, frequent light irrigation.",
  },
  soybean: {
    id: "soybean",
    label: "Soybean",
    isPaddy: false,
    kc: { initial: 0.35, mid: 1.15, late: 0.5 },
    rootDepthM: { initial: 0.3, mid: 1.0 },
    stageDays: { initial: 20, development: 30, mid: 40, late: 20 },
    p: 0.5,
    yieldLossPerStressDay: 0.01,
    notes: "Sensitive in pod-fill.",
  },
  peanut: {
    id: "peanut",
    label: "Peanut (groundnut)",
    isPaddy: false,
    kc: { initial: 0.4, mid: 1.1, late: 0.6 },
    rootDepthM: { initial: 0.3, mid: 0.9 },
    stageDays: { initial: 25, development: 35, mid: 45, late: 25 },
    p: 0.5,
    yieldLossPerStressDay: 0.009,
    notes: "Pod-fill is the critical window.",
  },
  cassava: {
    id: "cassava",
    label: "Cassava",
    isPaddy: false,
    kc: { initial: 0.35, mid: 1.0, late: 0.5 },
    rootDepthM: { initial: 0.4, mid: 1.2 },
    stageDays: { initial: 30, development: 60, mid: 120, late: 40 },
    p: 0.6,
    yieldLossPerStressDay: 0.004,
    notes: "Drought tolerant; deep roots.",
  },
  fruit: {
    id: "fruit",
    label: "Fruit orchard",
    isPaddy: false,
    kc: { initial: 0.5, mid: 0.95, late: 0.7 },
    rootDepthM: { initial: 0.6, mid: 1.5 },
    stageDays: { initial: 60, development: 90, mid: 120, late: 60 },
    p: 0.5,
    yieldLossPerStressDay: 0.006,
    notes: "Perennial orchard (mango/citrus class).",
  },
};

export interface SoilParams {
  id: string;
  label: string;
  fc: number; // field capacity, m3/m3 (volumetric)
  wp: number; // wilting point, m3/m3
  runoffFraction: number; // fraction of daily rainfall that runs off (base)
}

// FAO-56 indicative soil water constants (m3/m3)
export const SOILS: Record<string, SoilParams> = {
  sand: { id: "sand", label: "Sand", fc: 0.12, wp: 0.04, runoffFraction: 0.05 },
  loamySand: { id: "loamySand", label: "Loamy sand", fc: 0.15, wp: 0.06, runoffFraction: 0.08 },
  sandyLoam: { id: "sandyLoam", label: "Sandy loam", fc: 0.21, wp: 0.09, runoffFraction: 0.12 },
  loam: { id: "loam", label: "Loam", fc: 0.27, wp: 0.12, runoffFraction: 0.15 },
  siltLoam: { id: "siltLoam", label: "Silt loam", fc: 0.30, wp: 0.13, runoffFraction: 0.18 },
  clayLoam: { id: "clayLoam", label: "Clay loam", fc: 0.34, wp: 0.19, runoffFraction: 0.24 },
  clay: { id: "clay", label: "Clay", fc: 0.40, wp: 0.23, runoffFraction: 0.28 },
};

export function getCrop(id: string): CropParams {
  return CROPS[id] ?? CROPS.vegetables;
}

export function getSoil(id: string): SoilParams {
  return SOILS[id] ?? SOILS.loam;
}

/** Kc for the current growth stage (dev = 0.5·(ini+mid), late = 0.5·(mid+late)). */
export function kcForStage(crop: CropParams, stage: GrowthStage): number {
  switch (stage) {
    case "initial":
      return crop.kc.initial;
    case "development":
      return (crop.kc.initial + crop.kc.mid) / 2;
    case "mid":
      return crop.kc.mid;
    case "late":
      return (crop.kc.mid + crop.kc.late) / 2;
    default:
      return crop.kc.mid;
  }
}

/** Root depth for the current stage (scaled between initial and full depth). */
export function rootDepthForStage(crop: CropParams, stage: GrowthStage): number {
  switch (stage) {
    case "initial":
      return crop.rootDepthM.initial;
    case "development":
      return (crop.rootDepthM.initial + crop.rootDepthM.mid) / 2;
    case "mid":
      return crop.rootDepthM.mid;
    case "late":
      return crop.rootDepthM.mid * 0.95;
    default:
      return crop.rootDepthM.mid;
  }
}

export const STAGE_LABELS: Record<GrowthStage, string> = {
  initial: "Initial",
  development: "Development",
  mid: "Mid-season",
  late: "Late-season",
};

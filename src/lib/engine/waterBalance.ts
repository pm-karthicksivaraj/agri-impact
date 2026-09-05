// FAO-56 style dual-bucket soil water balance (server-side).
//
// Two buckets are tracked for every field:
//   1. SURFACE layer (0–10 cm) — the layer satellite radar (SAR) sees.
//      Dries fast via bare-soil evaporation; comparable to AgroAI-style
//      "surface moisture" products.
//   2. ROOT ZONE (crop-specific depth) — the layer crops actually drink from.
//      Drives irrigation decisions and yield-stress logic.
//
// The past PAST_DAYS of REAL observed weather (Open-Meteo/ERA5 blend) are
// replayed from a field-capacity initial state to estimate today's moisture,
// then the next 7 days of REAL forecast weather are simulated as a dry-run
// (no irrigation) to predict stress onset — which is what triggers advisories.
//
// All equations follow FAO-56 (Allen et al., 1998): ETc = Kc · ET0,
// stress begins when depletion exceeds the crop's readily available water
// (RAW = p · TAW). Simplifications are documented in the Methodology page.

import { getCrop, getSoil, kcForStage, rootDepthForStage } from "./crops";
import { FORECAST_DAYS, MODEL_VERSION, SURFACE_LAYER_MM } from "./constants";
import type { DailyPoint, GrowthStage, WaterBalanceResult } from "./types";
import { splitPastForecast, type WeatherBundle } from "./weather";

const SURFACE_EVAP_FRACTION = 0.6; // fraction of ET0 lost from bare surface when wet
const RUNOFF_EXCESS_FRACTION = 0.6; // fraction of rain above 25mm/day that runs off

export function computeWaterBalance(
  cropId: string,
  soilId: string,
  stage: GrowthStage,
  weather: WeatherBundle
): WaterBalanceResult {
  const crop = getCrop(cropId);
  const soil = getSoil(soilId);

  const kc = kcForStage(crop, stage);
  const rootDepthM = Math.max(0.2, rootDepthForStage(crop, stage));

  // Available water capacity (mm) of each bucket
  const pawRoot = (soil.fc - soil.wp) * rootDepthM * 1000; // mm
  const awcSurface = (soil.fc - soil.wp) * SURFACE_LAYER_MM; // mm
  const rawThresholdPct = (1 - crop.p) * 100; // stress below this % of AWC
  const stressTargetPct = crop.isPaddy ? Math.max(rawThresholdPct, 85) : rawThresholdPct;

  const { pastIdx, forecastIdx } = splitPastForecast(weather);
  const w = weather.daily;
  const totalDays = w.time.length;

  if (totalDays < 8) {
    throw new Error("Insufficient weather data returned by the service");
  }

  // --- state (mm of available water in each bucket) ---
  let rootWater = pawRoot; // spin-up assumption: profile at field capacity
  let surfaceWater = awcSurface;

  const series: DailyPoint[] = [];

  const simulateDay = (i: number, phase: "past" | "forecast") => {
    const precip = w.precip[i];
    const et0 = w.et0[i];
    const tmax = w.tmax[i];

    // effective precipitation: soil-specific runoff + intensity excess
    let runoff: number;
    if (precip <= 25) {
      runoff = precip * soil.runoffFraction;
    } else {
      runoff = 25 * soil.runoffFraction + (precip - 25) * RUNOFF_EXCESS_FRACTION;
    }
    const peff = Math.max(0, precip - runoff);

    const etc = kc * et0;
    const evap = Math.min(surfaceWater + peff, SURFACE_EVAP_FRACTION * et0);

    // water enters soil: fills surface bucket first, then the deeper profile
    let inflow = peff;
    surfaceWater = Math.min(awcSurface, surfaceWater + inflow);
    const surfaceGain = surfaceWater; // post-add (for tracking) — not used further
    void surfaceGain;
    rootWater = Math.min(pawRoot, rootWater + inflow);
    inflow = 0;

    // losses: evaporation from surface + transpiration from the root zone total
    surfaceWater = Math.max(0, surfaceWater - evap);
    rootWater = Math.max(0, rootWater - etc);
    surfaceWater = Math.min(surfaceWater, rootWater); // keep surface physically ≤ profile

    const rootzonePct = pawRoot > 0 ? (rootWater / pawRoot) * 100 : 0;
    const surfacePct = awcSurface > 0 ? (surfaceWater / awcSurface) * 100 : 0;

    series.push({
      date: w.time[i],
      phase,
      precip: round2(precip),
      precipEffective: round2(peff),
      runoff: round2(runoff),
      et0: round2(et0),
      tmax: round2(tmax),
      kc: round2(kc),
      etc: round2(etc),
      surface: round1(clamp(surfacePct, 0, 100)),
      rootzone: round1(clamp(rootzonePct, 0, 100)),
      irrigation: 0,
      stressed: rootzonePct < stressTargetPct,
    });
  };

  // 1) replay observed weather to establish today's state
  for (const i of pastIdx) simulateDay(i, "past");

  // 2) dry-run forecast: NO irrigation applied — predicts what happens if the
  //    farmer does nothing (this is the "see ahead" feature)
  for (const i of forecastIdx) simulateDay(i, "forecast");

  const currentIdx = Math.max(0, pastIdx.length - 1);
  const currentPoint = series[currentIdx];

  // forecast statistics over the dry-run window
  const forecastPoints = series.slice(pastIdx.length);
  let stressDays = 0;
  let nextIrrigationDay: number | null = null;
  let minRootzone = currentPoint.rootzone;
  let minSurface = currentPoint.surface;
  let totalEt0 = 0;
  let totalPrecip = 0;
  let maxDailyPrecip = 0;
  let maxTmax = 0;

  forecastPoints.forEach((p, idx) => {
    if (p.stressed) {
      stressDays++;
      if (nextIrrigationDay === null) nextIrrigationDay = idx;
    }
    minRootzone = Math.min(minRootzone, p.rootzone);
    minSurface = Math.min(minSurface, p.surface);
    totalEt0 += p.et0;
    totalPrecip += p.precip;
    maxDailyPrecip = Math.max(maxDailyPrecip, p.precip);
    maxTmax = Math.max(maxTmax, p.tmax);
  });

  // already stressed now → urgent (index 0 = today)
  if (currentPoint.stressed) nextIrrigationDay = 0;

  // irrigation need: refill root zone to field capacity at the advisory day
  const rootWaterAtAdvisory =
    nextIrrigationDay !== null ? (forecastPoints[nextIrrigationDay]?.rootzone ?? 0) / 100 * pawRoot : 0;
  const irrigationNeedMm =
    nextIrrigationDay !== null ? Math.max(0, Math.round(pawRoot - rootWaterAtAdvisory)) : 0;

  return {
    modelVersion: MODEL_VERSION,
    weatherSource: weather.url,
    series,
    current: {
      surface: currentPoint.surface,
      rootzone: currentPoint.rootzone,
      rootzoneVolumetric: round3(soil.wp + (rootWater / pawRoot) * (soil.fc - soil.wp)),
      depletionPct: round1(100 - currentPoint.rootzone),
      raw: round1(stressTargetPct),
    },
    forecast7: {
      stressDays,
      nextIrrigationDay,
      irrigationNeedMm,
      totalEt0: round1(totalEt0),
      totalPrecip: round1(totalPrecip),
      minRootzone: round1(minRootzone),
      minSurface: round1(minSurface),
      maxDailyPrecip: round1(maxDailyPrecip),
      maxTmax: round1(maxTmax),
    },
    soil: {
      fc: soil.fc,
      wp: soil.wp,
      paw: round1(pawRoot),
      rootDepthM: round2(rootDepthM),
    },
  };
}

/** How deep the drought signal goes (used in advisory wording). */
export function describeDryness(result: WaterBalanceResult): string {
  const { surface, rootzone } = result.current;
  if (rootzone < 30) return "severe root-zone depletion";
  if (rootzone < 50) return "root-zone stress developing";
  if (surface < 30 && rootzone >= 60) return "dry surface layer, adequate root zone";
  return "adequate soil water";
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

export { FORECAST_DAYS };

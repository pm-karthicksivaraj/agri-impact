// Alert rule engine + advisory drafting (server-side).
// Rules run on the 7-day dry-run forecast produced by the water balance model.

import { EXTREME_HEAT_C, EXTREME_RAIN_MM, HEAT_TMAX_C, HEAVY_RAIN_MM, CONVENTIONAL_MM_PER_WEEK } from "./constants";
import { getCrop, STAGE_LABELS } from "./crops";
import { pumpingEnergyKwh } from "./impact";
import type { AdvisoryDraft, AlertDraft, GrowthStage, WaterBalanceResult } from "./types";

export function evaluateAlerts(
  cropId: string,
  stage: GrowthStage,
  result: WaterBalanceResult
): AlertDraft[] {
  const crop = getCrop(cropId);
  const alerts: AlertDraft[] = [];
  const f = result.forecast7;
  const cur = result.current;
  const stageLabel = STAGE_LABELS[stage];

  // --- rule 1: dry stress (root zone crossing the crop's RAW threshold) ---
  const urgent = cur.rootzone < cur.raw || (f.nextIrrigationDay !== null && f.nextIrrigationDay <= 1);
  if (f.stressDays > 0) {
    const severity: AlertDraft["severity"] = urgent || f.minRootzone < 25 ? "critical" : "warning";
    alerts.push({
      type: "dry-stress",
      severity,
      title: `${urgent ? "Urgent" : "Upcoming"} dry stress — ${crop.label}`,
      message:
        `Root-zone available water is projected to fall below the stress threshold ` +
        `(${cur.raw.toFixed(0)}% AWC) on ${f.stressDays} of the next 7 days ` +
        `(minimum ${f.minRootzone.toFixed(0)}%). Surface layer: ${cur.surface.toFixed(0)}%. ` +
        `Crop stage: ${stageLabel}. ${crop.notes}`,
      metricKey: "min_rootzone_awc_pct",
      metricValue: f.minRootzone,
    });
  }

  // --- rule 2: heavy rain (drainage for paddy, erosion for upland) ---
  if (f.maxDailyPrecip >= HEAVY_RAIN_MM) {
    const severity: AlertDraft["severity"] = f.maxDailyPrecip >= EXTREME_RAIN_MM ? "critical" : "warning";
    alerts.push({
      type: "heavy-rain",
      severity,
      title: `Heavy rain expected (${f.maxDailyPrecip.toFixed(0)} mm/day)`,
      message: crop.isPaddy
        ? "Paddy field: prepare drainage outlets to avoid submergence above the safe ponding depth; check bunds."
        : "Upland crop: expect runoff and nutrient leaching on slopes; consider temporary field barriers.",
      metricKey: "max_daily_precip_mm",
      metricValue: f.maxDailyPrecip,
    });
  }

  // --- rule 3: heat during sensitive stages ---
  if (f.maxTmax >= HEAT_TMAX_C && (stage === "mid" || stage === "development" || stage === "late")) {
    const severity: AlertDraft["severity"] = f.maxTmax >= EXTREME_HEAT_C ? "critical" : "warning";
    alerts.push({
      type: "heat",
      severity,
      title: `Heat risk ${f.maxTmax.toFixed(0)}°C in next 7 days`,
      message:
        `High temperatures during ${stageLabel.toLowerCase()} stage can cut ${crop.label} yield. ` +
        `Irrigating early morning reduces transpiration stress; avoid midday operations.`,
      metricKey: "max_tmax_c",
      metricValue: f.maxTmax,
    });
  }

  return alerts;
}

export function draftAdvisories(
  field: { areaHa: number; cropType: string; soilType: string; growthStage: string; irrigationMethod: string },
  result: WaterBalanceResult,
  alertDayDate: string | null,
  todayIso: string
): AdvisoryDraft[] {
  const crop = getCrop(field.cropType);
  const f = result.forecast7;
  const cur = result.current;
  const out: AdvisoryDraft[] = [];

  // --- irrigation advisory ---
  if (f.nextIrrigationDay !== null && f.irrigationNeedMm > 0) {
    const windowDay = alertDayDate ?? todayIso;
    const periodDays = 7;
    const baselineMm = conventionalDepthFor(field.cropType, periodDays);
    const waterMm = f.irrigationNeedMm;
    const savedMm = Math.max(0, baselineMm - waterMm);
    const liters = Math.round(waterMm * field.areaHa * 10000); // mm × m²
    const urgency = f.nextIrrigationDay <= 1 ? "now" : `in ${f.nextIrrigationDay} day(s)`;
    const pumping = field.irrigationMethod !== "gravity";

    out.push({
      type: "irrigation",
      title: `Irrigate ${crop.label} ${urgency} — ${waterMm} mm (${fmtLiters(liters)})`,
      detail:
        `Root-zone available water is heading below the ${cur.raw.toFixed(0)}% stress threshold ` +
        `(${crop.label}, stage ${field.growthStage}). Apply ${waterMm} mm on ${windowDay} to refill the ` +
        `root zone (depth ${result.soil.rootDepthM} m, soil PAW ${result.soil.paw} mm) to field capacity. ` +
        (pumping
          ? `Pumping estimate: ~${Math.round(pumpingEnergyKwh(waterMm, field.areaHa))} kWh for this event. `
          : "Gravity-fed system: no pumping energy required. ") +
        `Conventional fixed schedule would apply ~${baselineMm} mm over the same window; ` +
        `targeted scheduling saves ${savedMm} mm (${fmtLiters(Math.round(savedMm * field.areaHa * 10000))}). ` +
        `7-day forecast: ET0 ${f.totalEt0} mm, rain ${f.totalPrecip} mm.`,
      windowDay,
      waterMm,
      baselineMm,
      savedMm,
    });
  } else {
    // no irrigation needed: an explicit "skip" advisory documenting the saving
    const baselineMm = conventionalDepthFor(field.cropType, 7);
    out.push({
      type: "irrigation",
      title: `Hold irrigation this week — soil water adequate`,
      detail:
        `Root-zone available water stays above the ${cur.raw.toFixed(0)}% stress threshold for the next 7 days ` +
        `(projected minimum ${f.minRootzone.toFixed(0)}%). A conventional fixed schedule would still apply ` +
        `~${baselineMm} mm; skipping it saves that water and pumping energy. ` +
        `7-day forecast: ET0 ${f.totalEt0} mm, rain ${f.totalPrecip} mm.`,
      windowDay: null,
      waterMm: 0,
      baselineMm,
      savedMm: baselineMm,
    });
  }

  // --- drainage advisory for paddy under heavy rain ---
  if (crop.isPaddy && f.maxDailyPrecip >= HEAVY_RAIN_MM) {
    out.push({
      type: "drainage",
      title: `Open paddy drainage before the ${f.maxDailyPrecip.toFixed(0)} mm rain day`,
      detail:
        "Heavy rain is forecast. Drain excess water to keep ponding within the safe depth for the crop stage " +
        "and check bunds/outlets beforehand to avoid crop submergence and fertiliser runoff.",
      windowDay: null,
      waterMm: 0,
      baselineMm: 0,
      savedMm: 0,
    });
  }

  return out;
}

/** Conventional scheduled depth (mm) the baseline would apply for N days. */
export function conventionalDepthFor(cropId: string, days: number): number {
  const perWeek = CONVENTIONAL_MM_PER_WEEK[cropId] ?? 30;
  return Math.round((perWeek / 7) * days);
}

function fmtLiters(l: number): string {
  if (l >= 1_000_000) return `${(l / 1_000_000).toFixed(1)} ML`;
  if (l >= 1000) return `${(l / 1000).toFixed(1)} kL`;
  return `${l} L`;
}

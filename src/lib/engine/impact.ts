// MRV (measurement, reporting, verification) impact engine.
//
// Every impact number in AgriImpact is computed here with an explicit method
// string and full input provenance, and written to the ImpactRecord ledger.
// Nothing in this file invents measurements — it converts ONE real decision
// (a farmer adopting / skipping irrigation vs a conventional schedule) into
// physical units using documented constants.

import {
  CONVENTIONAL_MM_PER_WEEK,
  GRID_EF_KG_PER_KWH,
  PUMP_EFFICIENCY,
  PUMP_HEAD_M,
  SCORE_WEIGHTS,
} from "./constants";
import { getCrop } from "./crops";

export const GRAVITY = 9.81; // m/s²
export const WATER_DENSITY = 1000; // kg/m³

/** Pumping energy for one irrigation event (kWh). 0 for gravity systems. */
export function pumpingEnergyKwh(depthMm: number, areaHa: number, method = "pump"): number {
  if (method === "gravity") return 0;
  const volumeM3 = depthMm / 1000 * areaHa * 10000; // mm→m × ha→m²
  // E = ρ·g·V·h / (3.6e6 · η)  [J → kWh]
  const kwh =
    (WATER_DENSITY * GRAVITY * volumeM3 * PUMP_HEAD_M) / (3.6e6 * PUMP_EFFICIENCY);
  return round2(kwh);
}

export interface ImpactComputationInput {
  fieldId: string;
  fieldName: string;
  cropType: string;
  areaHa: number;
  irrigationMethod: string;
  waterMm: number; // depth the advisory recommends (mm)
  baselineMm: number; // depth the conventional schedule would apply (mm)
  savedMm: number; // baseline - recommended
  periodDays: number; // window the numbers cover
  stressDaysAvoided: number; // model-estimated stress days avoided by the plan
  decidedAt: Date;
}

export interface ImpactComputationOutput {
  waterLitersSaved: number;
  energyKwhAvoided: number;
  co2KgAvoided: number;
  yieldProtectionPct: number;
  records: {
    metric: string;
    value: number;
    unit: string;
    method: string;
    inputsJson: string;
  }[];
}

/**
 * Compute the impact of adopting an advisory (or an explicit skip advisory):
 * water + energy + CO2e saved vs the conventional baseline, and the yield
 * protection from avoided stress days.
 */
export function computeImpact(inp: ImpactComputationInput): ImpactComputationOutput {
  const crop = getCrop(inp.cropType);
  const areaM2 = inp.areaHa * 10000;

  // --- water saved ---
  const savedDepthMm = Math.max(0, inp.savedMm);
  const savedM3 = (savedDepthMm / 1000) * areaM2;
  const waterLitersSaved = Math.round(savedM3 * 1000);

  // --- energy avoided (only if the baseline would pump) ---
  const baselineM3 = (inp.baselineMm / 1000) * areaM2;
  const appliedM3 = (inp.waterMm / 1000) * areaM2;
  const avoidedM3 = Math.max(0, baselineM3 - appliedM3);
  const energyKwhAvoided = round2(pumpingEnergyKwhFromVolume(avoidedM3, inp.irrigationMethod));

  // --- carbon ---
  const co2KgAvoided = round2(energyKwhAvoided * GRID_EF_KG_PER_KWH);

  // --- yield protection from stress days avoided ---
  const yieldProtectionPct = round2(
    Math.min(30, inp.stressDaysAvoided * crop.yieldLossPerStressDay * 100)
  );

  const provenance = {
    field: { id: inp.fieldId, name: inp.fieldName, areaHa: inp.areaHa, crop: inp.cropType },
    advisory: { waterMm: inp.waterMm, baselineMm: inp.baselineMm, savedMm: inp.savedMm },
    windowDays: inp.periodDays,
    decidedAt: inp.decidedAt.toISOString(),
    constants: {
      conventionalScheduleMmPerWeek: CONVENTIONAL_MM_PER_WEEK[inp.cropType] ?? 30,
      pumpHeadM: PUMP_HEAD_M,
      pumpEfficiency: PUMP_EFFICIENCY,
      gridEmissionFactorKgPerKwh: GRID_EF_KG_PER_KWH,
      cropYieldLossPerStressDay: crop.yieldLossPerStressDay,
    },
  };

  const records: ImpactComputationOutput["records"] = [];

  if (waterLitersSaved > 0) {
    records.push({
      metric: "water_liters_saved",
      value: waterLitersSaved,
      unit: "L",
      method: "Volumetric: (baseline schedule − advisory depth) × field area",
      inputsJson: JSON.stringify(provenance),
    });
  }
  if (energyKwhAvoided > 0) {
    records.push({
      metric: "energy_kwh_avoided",
      value: energyKwhAvoided,
      unit: "kWh",
      method: `ρ·g·V·h/η — avoided pumped volume, h=${PUMP_HEAD_M} m, η=${PUMP_EFFICIENCY}`,
      inputsJson: JSON.stringify(provenance),
    });
  }
  if (co2KgAvoided > 0) {
    records.push({
      metric: "co2_kg_avoided",
      value: co2KgAvoided,
      unit: "kgCO2e",
      method: `Avoided kWh × grid EF ${GRID_EF_KG_PER_KWH} kg/kWh (IGES, VN-2019)`,
      inputsJson: JSON.stringify(provenance),
    });
  }
  if (yieldProtectionPct > 0) {
    records.push({
      metric: "yield_protection_pct",
      value: yieldProtectionPct,
      unit: "% of plot yield",
      method: `Model stress-days avoided × crop sensitivity (${crop.yieldLossPerStressDay}/day)`,
      inputsJson: JSON.stringify(provenance),
    });
  }

  return { waterLitersSaved, energyKwhAvoided, co2KgAvoided, yieldProtectionPct, records };
}

function pumpingEnergyKwhFromVolume(volumeM3: number, method: string): number {
  if (method === "gravity") return 0;
  return (WATER_DENSITY * GRAVITY * volumeM3 * PUMP_HEAD_M) / (3.6e6 * PUMP_EFFICIENCY);
}

// ---------------------------------------------------------------------------
// Aggregation: sustainability score + SDG alignment (computed on the fly from
// ledger records + field states — never stored, always re-derived)
// ---------------------------------------------------------------------------

export interface FieldAggregate {
  fieldId: string;
  fieldName: string;
  cropType: string;
  region: string;
  ownerName: string;
  areaHa: number;
  waterLitersSaved: number;
  energyKwhAvoided: number;
  co2KgAvoided: number;
  yieldProtectionPct: number;
  advisoryBaselineMm: number;
  advisoryWaterMm: number;
  adopted: number;
  dismissed: number;
  pending: number;
  currentRootzone: number | null;
  raw: number | null;
  score: number;
}

export interface AggregateSummary {
  totals: {
    fields: number;
    areaHa: number;
    waterLitersSaved: number;
    waterLitersPerHa: number;
    energyKwhAvoided: number;
    co2KgAvoided: number;
    yieldProtectionAvgPct: number;
    adoptionRatePct: number;
    waterUseEfficiencyGainPct: number;
  };
  score: {
    overall: number;
    components: { key: string; label: string; weight: number; value: number }[];
  };
  sdg: {
    goal: number;
    target: string;
    label: string;
    progressPct: number;
    detail: string;
  }[];
}

export function aggregateImpact(fields: FieldAggregate[]): AggregateSummary {
  const n = fields.length;
  const sum = (f: (x: FieldAggregate) => number) => fields.reduce((s, x) => s + f(x), 0);

  const areaHa = sum((x) => x.areaHa);
  const water = sum((x) => x.waterLitersSaved);
  const energy = sum((x) => x.energyKwhAvoided);
  const co2 = sum((x) => x.co2KgAvoided);
  const baselineMm = sum((x) => x.advisoryBaselineMm);
  const waterMm = sum((x) => x.advisoryWaterMm);
  const decided = sum((x) => x.adopted + x.dismissed);
  const adopted = sum((x) => x.adopted);
  const yieldAvg = n > 0 ? sum((x) => x.yieldProtectionPct) / n : 0;

  // --- sustainability score (0–100, transparent weights) ---
  // water efficiency: share of baseline water NOT applied thanks to advisories
  const waterScore = baselineMm > 0 ? clampPct((100 * (baselineMm - waterMm)) / baselineMm) : 0;
  // stress management: average current root-zone status vs threshold
  const withStatus = fields.filter((x) => x.currentRootzone !== null && x.raw !== null);
  const stressScore =
    withStatus.length > 0
      ? clampPct(withStatus.reduce((s, x) => s + (100 * Math.min(x.currentRootzone!, x.raw! + 15)) / x.raw!, 0) / withStatus.length)
      : 0;
  // adoption: share of decided advisories that were adopted
  const adoptionScore = decided > 0 ? clampPct((100 * adopted) / decided) : 0;
  // energy: normalise avoided kWh per ha (100 kWh/ha ≈ full marks)
  const energyScore = areaHa > 0 ? clampPct((100 * energy) / (100 * areaHa)) : 0;

  const components = [
    { key: "water", label: "Water-use efficiency", weight: SCORE_WEIGHTS.water, value: round1(waterScore) },
    { key: "stress", label: "Stress management", weight: SCORE_WEIGHTS.stress, value: round1(stressScore) },
    { key: "adoption", label: "Advisory adoption", weight: SCORE_WEIGHTS.adoption, value: round1(adoptionScore) },
    { key: "energy", label: "Energy & carbon", weight: SCORE_WEIGHTS.energy, value: round1(energyScore) },
  ];
  const overall = round1(components.reduce((s, c) => s + c.weight * c.value, 0));

  // --- SDG indicators ---
  const waterPerHa = areaHa > 0 ? water / areaHa : 0;
  const wueGain = baselineMm > 0 ? (100 * (baselineMm - waterMm)) / baselineMm : 0;
  const sdg = [
    {
      goal: 6,
      target: "6.4",
      label: "Water-use efficiency (SDG 6.4.1 concept)",
      progressPct: round1(clampPct(wueGain)),
      detail: `${round1(wueGain)}% less irrigation water than the conventional schedule — ${Math.round(waterPerHa).toLocaleString()} L/ha saved across ${round1(areaHa)} ha.`,
    },
    {
      goal: 2,
      target: "2.3",
      label: "Smallholder productivity & income (SDG 2.3)",
      progressPct: round1(clampPct(yieldAvg * 5)),
      detail: `Model-estimated yield protection averages ${round1(yieldAvg)}% on protected plots, mainly by avoiding stress during sensitive stages.`,
    },
    {
      goal: 13,
      target: "13.3",
      label: "Climate action & awareness (SDG 13)",
      progressPct: round1(clampPct(50 + (50 * adoptionScore) / 100)),
      detail: `${round2(co2)} kgCO₂e avoided (grid EF ${GRID_EF_KG_PER_KWH} kg/kWh) and ${decided} climate-informed irrigation decisions taken.`,
    },
  ];

  return {
    totals: {
      fields: n,
      areaHa: round2(areaHa),
      waterLitersSaved: water,
      waterLitersPerHa: Math.round(waterPerHa),
      energyKwhAvoided: round2(energy),
      co2KgAvoided: round2(co2),
      yieldProtectionAvgPct: round1(yieldAvg),
      adoptionRatePct: decided > 0 ? round1((100 * adopted) / decided) : 0,
      waterUseEfficiencyGainPct: round1(wueGain),
    },
    score: { overall, components },
    sdg,
  };
}

function clampPct(v: number): number {
  return Math.min(100, Math.max(0, v));
}
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

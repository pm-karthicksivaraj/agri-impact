// Analysis orchestrator (server-side): runs the full pipeline for one field —
// weather → water balance → alerts → advisories → snapshot persisted to DB.

import { db } from "@/lib/db";
import { draftAdvisories, evaluateAlerts } from "./alerts";
import { computeWaterBalance } from "./waterBalance";
import { getWeather, WeatherUnavailableError } from "./weather";
import type { AdvisoryDraft, AlertDraft, GrowthStage, WaterBalanceResult } from "./types";
import type { Field } from "@prisma/client";

export interface AnalysisResult {
  snapshotId: string;
  balance: WaterBalanceResult;
  advisories: AdvisoryDraft[];
  alerts: AlertDraft[];
}

export class AnalysisError extends Error {
  constructor(
    message: string,
    public code: "weather-unavailable" | "insufficient-data"
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

export async function runAnalysis(field: Field): Promise<AnalysisResult> {
  let weather;
  try {
    weather = await getWeather(field.centroidLat, field.centroidLng);
  } catch (e) {
    if (e instanceof WeatherUnavailableError) {
      throw new AnalysisError(e.message, "weather-unavailable");
    }
    throw e;
  }

  let balance: WaterBalanceResult;
  try {
    balance = computeWaterBalance(field.cropType, field.soilType, field.growthStage as GrowthStage, weather);
  } catch (e) {
    throw new AnalysisError(
      e instanceof Error ? e.message : "water balance computation failed",
      "insufficient-data"
    );
  }

  const alerts = evaluateAlerts(field.cropType, field.growthStage as GrowthStage, balance);

  const forecastIdx = balance.series.length - weather.forecastDays;
  const alertDayIdx =
    balance.forecast7.nextIrrigationDay !== null ? forecastIdx + balance.forecast7.nextIrrigationDay : null;
  const todayIso = balance.series[Math.max(0, forecastIdx)]?.date ?? new Date().toISOString().slice(0, 10);
  const windowDate = alertDayIdx !== null ? (balance.series[alertDayIdx]?.date ?? null) : null;

  const advisories = draftAdvisories(
    {
      areaHa: field.areaHa,
      cropType: field.cropType,
      soilType: field.soilType,
      growthStage: field.growthStage,
      irrigationMethod: field.irrigationMethod,
    },
    balance,
    windowDate,
    todayIso
  );

  const runAt = new Date();

  // persist snapshot
  const snapshot = await db.analysisSnapshot.create({
    data: {
      fieldId: field.id,
      runAt,
      modelVersion: balance.modelVersion,
      weatherSource: balance.weatherSource,
      currentSurface: balance.current.surface,
      currentRootzone: balance.current.rootzone,
      stressDays: balance.forecast7.stressDays,
      nextIrrigation: balance.forecast7.nextIrrigationDay,
      forecastJson: JSON.stringify({
        series: balance.series,
        current: balance.current,
        forecast7: balance.forecast7,
        soil: balance.soil,
      }),
    },
  });

  // replace pending advisories from previous runs (decided ones are kept — they
  // are part of the impact ledger provenance)
  await db.advisory.deleteMany({ where: { fieldId: field.id, status: "pending" } });
  for (const adv of advisories) {
    await db.advisory.create({
      data: {
        fieldId: field.id,
        runAt,
        type: adv.type,
        title: adv.title,
        detail: adv.detail,
        windowDay: adv.windowDay,
        waterMm: adv.waterMm,
        baselineMm: adv.baselineMm,
        savedMm: adv.savedMm,
        status: "pending",
      },
    });
  }

  // dedupe alerts: remove unacknowledged alerts of the same type from older runs
  const alertTypes = [...new Set(alerts.map((a) => a.type))];
  if (alertTypes.length > 0) {
    await db.alertEvent.deleteMany({
      where: { fieldId: field.id, acknowledged: false, type: { in: alertTypes } },
    });
  }
  for (const al of alerts) {
    await db.alertEvent.create({
      data: {
        fieldId: field.id,
        triggeredAt: runAt,
        type: al.type,
        severity: al.severity,
        title: al.title,
        message: al.message,
        metricKey: al.metricKey,
        metricValue: al.metricValue,
      },
    });
  }

  return { snapshotId: snapshot.id, balance, advisories, alerts };
}

/** Parse the forecast JSON back into shape for API responses. */
export function parseSnapshotForecast(snapshot: { forecastJson: string }) {
  try {
    return JSON.parse(snapshot.forecastJson) as {
      series: WaterBalanceResult["series"];
      current: WaterBalanceResult["current"];
      forecast7: WaterBalanceResult["forecast7"];
      soil: WaterBalanceResult["soil"];
    };
  } catch {
    return null;
  }
}

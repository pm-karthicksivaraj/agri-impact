// Shared engine types

export type LatLng = [number, number]; // [lat, lng]
export type Polygon = LatLng[];

export type GrowthStage = "initial" | "development" | "mid" | "late";

export interface DailyPoint {
  date: string; // ISO yyyy-mm-dd
  phase: "past" | "forecast";
  precip: number; // mm (raw)
  precipEffective: number; // mm (after runoff)
  runoff: number; // mm
  et0: number; // mm reference evapotranspiration
  tmax: number; // °C
  kc: number;
  etc: number; // mm crop evapotranspiration
  surface: number; // % available water (0-10 cm layer)
  rootzone: number; // % available water (root zone)
  irrigation: number; // mm applied by plan (forecast days only)
  stressed: boolean; // rootzone below stress threshold
}

export interface WaterBalanceResult {
  modelVersion: string;
  weatherSource: string;
  series: DailyPoint[];
  current: {
    surface: number; // % AWC
    rootzone: number; // % AWC
    rootzoneVolumetric: number; // m3/m3
    depletionPct: number; // % of PAW depleted
    raw: number; // readily available water threshold (% AWC)
  };
  forecast7: {
    stressDays: number;
    nextIrrigationDay: number | null; // index (0 = today) within 7-day window
    irrigationNeedMm: number; // mm to refill root zone at advisory day
    totalEt0: number;
    totalPrecip: number;
    minRootzone: number;
    minSurface: number;
    maxDailyPrecip: number;
    maxTmax: number;
  };
  soil: { fc: number; wp: number; paw: number; rootDepthM: number };
}

export interface AdvisoryDraft {
  type: "irrigation" | "drainage" | "protection";
  title: string;
  detail: string;
  windowDay: string | null;
  waterMm: number;
  baselineMm: number;
  savedMm: number;
}

export interface AlertDraft {
  type: "dry-stress" | "heavy-rain" | "heat";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  metricKey: string;
  metricValue: number;
}

export interface FieldInput {
  id: string;
  name: string;
  cropType: string;
  soilType: string;
  growthStage: string;
  region: string;
  ownerName: string;
  areaHa: number;
  centroidLat: number;
  centroidLng: number;
  irrigationMethod: string;
}

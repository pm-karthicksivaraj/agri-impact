"use client";

// Typed API client — mirrors the server route response shapes exactly.

export interface FieldListItem {
  id: string;
  name: string;
  cropType: string;
  cropLabel: string;
  soilType: string;
  soilLabel: string;
  growthStage: string;
  region: string;
  ownerName: string;
  ownerRole: string;
  areaHa: number;
  centroidLat: number;
  centroidLng: number;
  irrigationMethod: string;
  isDemo: boolean;
  polygon: [number, number][];
  createdAt: string;
  latestRunAt: string | null;
  currentRootzone: number | null;
  currentSurface: number | null;
  raw: number | null;
  stressDays: number | null;
  nextIrrigation: number | null;
  alertCount: number;
  pendingAdvisories: number;
}

export interface DailyPoint {
  date: string;
  phase: "past" | "forecast";
  precip: number;
  precipEffective: number;
  runoff: number;
  et0: number;
  tmax: number;
  kc: number;
  etc: number;
  surface: number;
  rootzone: number;
  irrigation: number;
  stressed: boolean;
}

export interface FieldDetail {
  field: {
    id: string;
    name: string;
    cropType: string;
    cropLabel: string;
    soilType: string;
    soilLabel: string;
    growthStage: string;
    growthStageLabel: string;
    region: string;
    ownerName: string;
    ownerRole: string;
    areaHa: number;
    centroidLat: number;
    centroidLng: number;
    irrigationMethod: string;
    isDemo: boolean;
    polygon: [number, number][];
    createdAt: string;
  };
  snapshot: {
    id: string;
    runAt: string;
    modelVersion: string;
    weatherSource: string;
    currentSurface: number;
    currentRootzone: number;
    stressDays: number;
    nextIrrigation: number | null;
    forecast: {
      series: DailyPoint[];
      current: {
        surface: number;
        rootzone: number;
        rootzoneVolumetric: number;
        depletionPct: number;
        raw: number;
      };
      forecast7: {
        stressDays: number;
        nextIrrigationDay: number | null;
        irrigationNeedMm: number;
        totalEt0: number;
        totalPrecip: number;
        minRootzone: number;
        minSurface: number;
        maxDailyPrecip: number;
        maxTmax: number;
      };
      soil: { fc: number; wp: number; paw: number; rootDepthM: number };
    } | null;
  } | null;
  advisories: {
    id: string;
    runAt: string;
    type: string;
    title: string;
    detail: string;
    windowDay: string | null;
    waterMm: number;
    baselineMm: number;
    savedMm: number;
    status: string;
    decidedAt: string | null;
  }[];
  alerts: {
    id: string;
    triggeredAt: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    acknowledged: boolean;
  }[];
  impactRecords: {
    id: string;
    recordedAt: string;
    metric: string;
    value: number;
    unit: string;
    method: string;
    periodDays: number;
  }[];
}

export interface ImpactSummary {
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
  sdg: { goal: number; target: string; label: string; progressPct: number; detail: string }[];
}

export interface ImpactResponse {
  summary: ImpactSummary;
  perField: {
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
  }[];
  groupByRegion: {
    label: string;
    areaHa: number;
    fields: number;
    waterLitersSaved: number;
    co2KgAvoided: number;
    adopted: number;
    advisoryWaterMm: number;
    advisoryBaselineMm: number;
  }[];
  groupByOwner: {
    label: string;
    areaHa: number;
    fields: number;
    waterLitersSaved: number;
    co2KgAvoided: number;
    adopted: number;
    advisoryWaterMm: number;
    advisoryBaselineMm: number;
  }[];
  records: {
    id: string;
    fieldId: string;
    fieldName: string;
    region: string;
    cropType: string;
    cropLabel: string;
    recordedAt: string;
    metric: string;
    value: number;
    unit: string;
    method: string;
    periodDays: number;
  }[];
}

export interface AlertItem {
  id: string;
  fieldId: string;
  fieldName: string;
  cropType: string;
  cropLabel: string;
  region: string;
  triggeredAt: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  metricKey: string | null;
  metricValue: number | null;
  acknowledged: boolean;
}

export interface CreateFieldInput {
  name: string;
  cropType: string;
  soilType: string;
  growthStage: string;
  region: string;
  ownerName: string;
  ownerRole: string;
  irrigationMethod: string;
  polygon: [number, number][];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      if (body.error) message = body.error;
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  listFields: () => fetch("/api/fields").then(handle<{ fields: FieldListItem[] }>),

  getField: (id: string) => fetch(`/api/fields/${id}`).then(handle<FieldDetail>),

  createField: (input: CreateFieldInput) =>
    fetch("/api/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(handle<{ field: FieldListItem; warning: string | null }>),

  deleteField: (id: string) =>
    fetch(`/api/fields/${id}`, { method: "DELETE" }).then(handle<{ deleted: string }>),

  analyzeField: (id: string) =>
    fetch(`/api/fields/${id}/analyze`, { method: "POST" }).then(
      handle<{ ok: true; advisories: number; alerts: number }>
    ),

  getFieldInsight: (id: string) =>
    fetch(`/api/fields/${id}/insight`, { method: "POST" }).then(
      handle<{ source: "ai" | "model"; text: string; generatedAt: string }>
    ),

  decideAdvisory: (id: string, status: "adopted" | "dismissed") =>
    fetch(`/api/advisories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then(
      handle<{
        advisory: { id: string; status: string; decidedAt: string | null };
        impactRecordsCreated: number;
        waterLitersSaved: number;
      }>
    ),

  listAlerts: () => fetch("/api/alerts").then(handle<{ alerts: AlertItem[] }>),

  acknowledgeAlert: (id: string) =>
    fetch(`/api/alerts/${id}`, { method: "PATCH" }).then(handle<{ id: string; acknowledged: boolean }>),

  scanAll: () =>
    fetch("/api/alerts/scan", { method: "POST" }).then(
      handle<{ ok: number; failed: number; alertCount: number; message: string }>
    ),

  getImpact: () => fetch("/api/impact").then(handle<ImpactResponse>),

  seed: () =>
    fetch("/api/seed", { method: "POST" }).then(
      handle<{ createdCount: number; message: string; warnings: string[] }>
    ),

  reset: () =>
    fetch("/api/seed", { method: "DELETE" }).then(handle<{ deletedFields: number; message: string }>),
};

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseSnapshotForecast } from "@/lib/engine/analysis";
import { CROPS, SOILS, STAGE_LABELS } from "@/lib/engine/crops";
import type { GrowthStage } from "@/lib/engine/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const field = await db.field.findUnique({
      where: { id },
      include: {
        advisories: { orderBy: { runAt: "desc" } },
        alerts: { orderBy: { triggeredAt: "desc" }, take: 20 },
        impactRecords: { orderBy: { recordedAt: "desc" }, take: 50 },
        snapshots: { orderBy: { runAt: "desc" }, take: 1 },
      },
    });
    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }
    const latest = field.snapshots[0] ?? null;
    const parsed = latest ? parseSnapshotForecast(latest) : null;

    return NextResponse.json({
      field: {
        id: field.id,
        name: field.name,
        cropType: field.cropType,
        cropLabel: CROPS[field.cropType]?.label ?? field.cropType,
        soilType: field.soilType,
        soilLabel: SOILS[field.soilType]?.label ?? field.soilType,
        growthStage: field.growthStage,
        growthStageLabel: STAGE_LABELS[field.growthStage as GrowthStage] ?? field.growthStage,
        region: field.region,
        ownerName: field.ownerName,
        ownerRole: field.ownerRole,
        areaHa: Math.round(field.areaHa * 100) / 100,
        centroidLat: field.centroidLat,
        centroidLng: field.centroidLng,
        irrigationMethod: field.irrigationMethod,
        isDemo: field.isDemo,
        polygon: JSON.parse(field.polygonJson) as [number, number][],
        createdAt: field.createdAt.toISOString(),
      },
      snapshot: latest
        ? {
            id: latest.id,
            runAt: latest.runAt.toISOString(),
            modelVersion: latest.modelVersion,
            weatherSource: latest.weatherSource,
            currentSurface: latest.currentSurface,
            currentRootzone: latest.currentRootzone,
            stressDays: latest.stressDays,
            nextIrrigation: latest.nextIrrigation,
            forecast: parsed,
          }
        : null,
      advisories: field.advisories.map((a) => ({
        id: a.id,
        runAt: a.runAt.toISOString(),
        type: a.type,
        title: a.title,
        detail: a.detail,
        windowDay: a.windowDay,
        waterMm: a.waterMm,
        baselineMm: a.baselineMm,
        savedMm: a.savedMm,
        status: a.status,
        decidedAt: a.decidedAt?.toISOString() ?? null,
      })),
      alerts: field.alerts.map((al) => ({
        id: al.id,
        triggeredAt: al.triggeredAt.toISOString(),
        type: al.type,
        severity: al.severity,
        title: al.title,
        message: al.message,
        acknowledged: al.acknowledged,
      })),
      impactRecords: field.impactRecords.map((r) => ({
        id: r.id,
        recordedAt: r.recordedAt.toISOString(),
        metric: r.metric,
        value: r.value,
        unit: r.unit,
        method: r.method,
        periodDays: r.periodDays,
      })),
    });
  } catch (e) {
    console.error("GET /api/fields/[id] failed", e);
    return NextResponse.json({ error: "Failed to load field" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const deleted = await db.field.delete({ where: { id } });
    return NextResponse.json({ deleted: deleted.id });
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }
    console.error("DELETE /api/fields/[id] failed", e);
    return NextResponse.json({ error: "Failed to delete field" }, { status: 500 });
  }
}

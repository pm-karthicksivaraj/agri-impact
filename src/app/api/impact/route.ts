import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aggregateImpact, type FieldAggregate } from "@/lib/engine/impact";
import { parseSnapshotForecast } from "@/lib/engine/analysis";
import { getCrop } from "@/lib/engine/crops";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const fields = await db.field.findMany({
      include: {
        advisories: true,
        snapshots: { orderBy: { runAt: "desc" }, take: 1 },
        impactRecords: { orderBy: { recordedAt: "desc" }, take: 200 },
      },
      orderBy: { createdAt: "desc" },
    });

    const aggregates: FieldAggregate[] = [];

    for (const f of fields) {
      const latest = f.snapshots[0] ?? null;
      const parsed = latest ? parseSnapshotForecast(latest) : null;

      const adopted = f.advisories.filter((a) => a.status === "adopted");
      const dismissed = f.advisories.filter((a) => a.status === "dismissed");
      const pending = f.advisories.filter((a) => a.status === "pending");

      // realised impact totals come from the MRV ledger (single source of truth)
      const metricSum = (metric: string) =>
        f.impactRecords.filter((r) => r.metric === metric).reduce((s, r) => s + r.value, 0);
      const yieldProtection =
        f.impactRecords
          .filter((r) => r.metric === "yield_protection_pct")
          .reduce((max, r) => Math.max(max, r.value), 0);

      aggregates.push({
        fieldId: f.id,
        fieldName: f.name,
        cropType: f.cropType,
        region: f.region,
        ownerName: f.ownerName,
        areaHa: Math.round(f.areaHa * 100) / 100,
        waterLitersSaved: Math.round(metricSum("water_liters_saved")),
        energyKwhAvoided: Math.round(metricSum("energy_kwh_avoided") * 100) / 100,
        co2KgAvoided: Math.round(metricSum("co2_kg_avoided") * 100) / 100,
        yieldProtectionPct: yieldProtection,
        advisoryBaselineMm: Math.round(adopted.reduce((s, a) => s + a.baselineMm, 0)),
        advisoryWaterMm: Math.round(adopted.reduce((s, a) => s + a.waterMm, 0)),
        adopted: adopted.length,
        dismissed: dismissed.length,
        pending: pending.length,
        currentRootzone: latest?.currentRootzone ?? null,
        raw: parsed?.current.raw ?? null,
        score: 0, // filled by aggregator
      });
    }

    const summary = aggregateImpact(aggregates);
    for (const a of aggregates) a.score = 0; // per-field score computed below
    // per-field score: same component logic, applied per field
    for (const a of aggregates) {
      const one = aggregateImpact([a]);
      a.score = one.score.overall;
    }

    // stakeholder groupings
    const groupBy = (key: "region" | "ownerName") => {
      const map = new Map<string, { label: string; areaHa: number; fields: number; waterLitersSaved: number; co2KgAvoided: number; adopted: number; advisoryWaterMm: number; advisoryBaselineMm: number }>();
      for (const a of aggregates) {
        const label = key === "region" ? a.region : a.ownerName;
        const g = map.get(label) ?? {
          label,
          areaHa: 0,
          fields: 0,
          waterLitersSaved: 0,
          co2KgAvoided: 0,
          adopted: 0,
          advisoryWaterMm: 0,
          advisoryBaselineMm: 0,
        };
        g.areaHa += a.areaHa;
        g.fields += 1;
        g.waterLitersSaved += a.waterLitersSaved;
        g.co2KgAvoided += a.co2KgAvoided;
        g.adopted += a.adopted;
        g.advisoryWaterMm += a.advisoryWaterMm;
        g.advisoryBaselineMm += a.advisoryBaselineMm;
        map.set(label, g);
      }
      return [...map.values()].sort((x, y) => y.waterLitersSaved - x.waterLitersSaved);
    };

    const records = await db.impactRecord.findMany({
      orderBy: { recordedAt: "desc" },
      take: 100,
      include: { field: true },
    });

    return NextResponse.json({
      summary,
      perField: aggregates,
      groupByRegion: groupBy("region"),
      groupByOwner: groupBy("ownerName"),
      records: records.map((r) => ({
        id: r.id,
        fieldId: r.fieldId,
        fieldName: r.field.name,
        region: r.field.region,
        cropType: r.field.cropType,
        cropLabel: getCrop(r.field.cropType).label,
        recordedAt: r.recordedAt.toISOString(),
        metric: r.metric,
        value: r.value,
        unit: r.unit,
        method: r.method,
        periodDays: r.periodDays,
      })),
    });
  } catch (e) {
    console.error("GET /api/impact failed", e);
    return NextResponse.json({ error: "Failed to aggregate impact" }, { status: 500 });
  }
}

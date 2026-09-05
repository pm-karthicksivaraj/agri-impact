import { db } from "@/lib/db";
import { aggregateImpact, type FieldAggregate } from "@/lib/engine/impact";
import { parseSnapshotForecast } from "@/lib/engine/analysis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** GET /api/export — full MRV export: summary + per-field + ledger as CSV. */
export async function GET() {
  try {
    const fields = await db.field.findMany({
      include: {
        advisories: true,
        snapshots: { orderBy: { runAt: "desc" }, take: 1 },
        impactRecords: { orderBy: { recordedAt: "desc" }, take: 200 },
      },
    });

    const aggregates: FieldAggregate[] = fields.map((f) => {
      const latest = f.snapshots[0] ?? null;
      const parsed = latest ? parseSnapshotForecast(latest) : null;
      const adopted = f.advisories.filter((a) => a.status === "adopted");
      const dismissed = f.advisories.filter((a) => a.status === "dismissed");
      const pending = f.advisories.filter((a) => a.status === "pending");
      const metricSum = (metric: string) =>
        f.impactRecords.filter((r) => r.metric === metric).reduce((s, r) => s + r.value, 0);
      return {
        fieldId: f.id,
        fieldName: f.name,
        cropType: f.cropType,
        region: f.region,
        ownerName: f.ownerName,
        areaHa: Math.round(f.areaHa * 100) / 100,
        waterLitersSaved: Math.round(metricSum("water_liters_saved")),
        energyKwhAvoided: Math.round(metricSum("energy_kwh_avoided") * 100) / 100,
        co2KgAvoided: Math.round(metricSum("co2_kg_avoided") * 100) / 100,
        yieldProtectionPct: f.impactRecords
          .filter((r) => r.metric === "yield_protection_pct")
          .reduce((max, r) => Math.max(max, r.value), 0),
        advisoryBaselineMm: Math.round(adopted.reduce((s, a) => s + a.baselineMm, 0)),
        advisoryWaterMm: Math.round(adopted.reduce((s, a) => s + a.waterMm, 0)),
        adopted: adopted.length,
        dismissed: dismissed.length,
        pending: pending.length,
        currentRootzone: latest?.currentRootzone ?? null,
        raw: parsed?.current.raw ?? null,
        score: 0,
      };
    });

    const summary = aggregateImpact(aggregates);

    const rows: (string | number)[][] = [];
    rows.push(["AgriImpact MRV export"]);
    rows.push(["generated_at_utc", new Date().toISOString()]);
    rows.push(["model_version", "fao56-dualbucket-v1"]);
    rows.push([]);
    rows.push(["SECTION", "SUMMARY"]);
    rows.push(["fields", summary.totals.fields]);
    rows.push(["area_ha", summary.totals.areaHa]);
    rows.push(["water_saved_liters", summary.totals.waterLitersSaved]);
    rows.push(["water_saved_liters_per_ha", summary.totals.waterLitersPerHa]);
    rows.push(["energy_avoided_kwh", summary.totals.energyKwhAvoided]);
    rows.push(["co2e_avoided_kg", summary.totals.co2KgAvoided]);
    rows.push(["yield_protection_avg_pct", summary.totals.yieldProtectionAvgPct]);
    rows.push(["advisory_adoption_rate_pct", summary.totals.adoptionRatePct]);
    rows.push(["water_use_efficiency_gain_pct", summary.totals.waterUseEfficiencyGainPct]);
    rows.push(["sustainability_score_overall", summary.score.overall]);
    rows.push([]);
    rows.push(["SECTION", "PER FIELD"]);
    rows.push([
      "field_name",
      "region",
      "owner",
      "crop",
      "area_ha",
      "water_saved_l",
      "energy_kwh",
      "co2e_kg",
      "yield_protection_pct",
      "sustainability_score",
    ]);
    for (const a of aggregates) {
      rows.push([
        a.fieldName,
        a.region,
        a.ownerName,
        a.cropType,
        a.areaHa,
        a.waterLitersSaved,
        a.energyKwhAvoided,
        a.co2KgAvoided,
        a.yieldProtectionPct,
        a.score,
      ]);
    }
    rows.push([]);
    rows.push(["SECTION", "IMPACT LEDGER (MRV audit trail)"]);
    rows.push([
      "recorded_at_utc",
      "field_name",
      "region",
      "metric",
      "value",
      "unit",
      "method",
      "period_days",
    ]);
    const records = await db.impactRecord.findMany({
      orderBy: { recordedAt: "desc" },
      include: { field: true },
    });
    for (const r of records) {
      rows.push([
        r.recordedAt.toISOString(),
        r.field.name,
        r.field.region,
        r.metric,
        r.value,
        r.unit,
        r.method,
        r.periodDays,
      ]);
    }
    rows.push([]);
    rows.push(["NOTES"]);
    rows.push([
      "Water saved = (conventional schedule − advisory depth) x area; constants documented in the app Methodology page.",
    ]);
    rows.push([
      "CO2e uses grid emission factor 0.6538 kgCO2/kWh (IGES, Vietnam 2019 grid average).",
    ]);
    rows.push(["Weather source: Open-Meteo (observed ERA5 blend + ICON/ECMWF forecast), no synthetic data."]);

    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agriimpact-mrv-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error("GET /api/export failed", e);
    return new Response("Failed to generate export", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEED_FIELDS } from "@/lib/engine/seed-data";
import { normalizePolygon, polygonAreaHa, polygonCentroid } from "@/lib/engine/geo";
import { runAnalysis } from "@/lib/engine/analysis";
import { decideAdvisory } from "@/lib/engine/adoption";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/seed — load the demo dataset. Every field is created at its real
 * location and analysed against LIVE weather; the auto-decisions marked in
 * seed-data.ts go through the same adoption pipeline as a real farmer decision,
 * writing genuine MRV records to the impact ledger.
 */
export async function POST() {
  try {
    const existingDemo = await db.field.count({ where: { isDemo: true } });
    if (existingDemo > 0) {
      return NextResponse.json(
        { error: "Demo dataset is already loaded. Use 'Clear all data' first if you want to re-seed." },
        { status: 409 }
      );
    }

    const created: string[] = [];
    let analysesOk = 0;
    let analysesFailed = 0;
    const warnings: string[] = [];

    for (const spec of SEED_FIELDS) {
      const polygon = normalizePolygon(spec.polygon);
      const areaHa = polygonAreaHa(polygon);
      const centroid = polygonCentroid(polygon);

      const field = await db.field.create({
        data: {
          name: spec.name,
          cropType: spec.cropType,
          soilType: spec.soilType,
          growthStage: spec.growthStage,
          region: spec.region,
          ownerName: spec.ownerName,
          ownerRole: spec.ownerRole,
          irrigationMethod: spec.irrigationMethod,
          polygonJson: JSON.stringify(polygon),
          areaHa: Math.round(areaHa * 10000) / 10000,
          centroidLat: centroid[0],
          centroidLng: centroid[1],
          isDemo: true,
        },
      });
      created.push(field.name);

      try {
        const result = await runAnalysis(field);
        analysesOk++;

        // auto-decide the first irrigation advisory according to the scenario
        if (spec.decide) {
          const irrigationAdvisory = result.advisories.find((a) => a.type === "irrigation");
          if (irrigationAdvisory) {
            const dbAdv = await db.advisory.findFirst({
              where: { fieldId: field.id, type: "irrigation", status: "pending" },
              orderBy: { createdAt: "desc" },
            });
            if (dbAdv) {
              await decideAdvisory(dbAdv, field, spec.decide);
            }
          }
        }
      } catch (e) {
        analysesFailed++;
        warnings.push(
          `${spec.name}: analysis failed — ${e instanceof Error ? e.message : "unknown error"}`
        );
      }
    }

    return NextResponse.json(
      {
        createdCount: created.length,
        analysesOk,
        analysesFailed,
        created,
        warnings,
        message:
          analysesFailed === 0
            ? `${created.length} demo fields created and analysed against live weather.`
            : `${created.length} fields created; ${analysesFailed} analyses failed (weather service busy — use "Run analysis" per field).`,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/seed failed", e);
    return NextResponse.json({ error: "Seeding failed" }, { status: 500 });
  }
}

/** DELETE /api/seed — clear ALL data (fields, snapshots, advisories, alerts, ledger). */
export async function DELETE() {
  try {
    // cascades handle advisory/alert/snapshot/impact records
    const deleted = await db.field.deleteMany({});
    return NextResponse.json({
      deletedFields: deleted.count,
      message: `Cleared ${deleted.count} field(s) and all related records.`,
    });
  } catch (e) {
    console.error("DELETE /api/seed failed", e);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}

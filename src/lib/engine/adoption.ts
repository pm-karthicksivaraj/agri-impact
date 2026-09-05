// Advisory decision handling (server-side): when a farmer adopts or dismisses
// an advisory, the impact engine computes the realised impact and writes it to
// the MRV ledger. Shared by the UI PATCH route and the demo seeder.

import { db } from "@/lib/db";
import { computeImpact } from "./impact";
import type { Advisory, Field, AnalysisSnapshot } from "@prisma/client";

export interface AdoptionOutcome {
  advisory: Advisory;
  impactRecordsCreated: number;
  waterLitersSaved: number;
}

export async function decideAdvisory(
  advisory: Advisory,
  field: Field,
  decision: "adopted" | "dismissed"
): Promise<AdoptionOutcome> {
  if (advisory.status !== "pending") {
    return { advisory, impactRecordsCreated: 0, waterLitersSaved: 0 };
  }

  const decidedAt = new Date();

  if (decision === "dismissed") {
    const updated = await db.advisory.update({
      where: { id: advisory.id },
      data: { status: "dismissed", decidedAt },
    });
    return { advisory: updated, impactRecordsCreated: 0, waterLitersSaved: 0 };
  }

  // adopted: compute realised impact vs the conventional baseline
  const latestSnapshot: AnalysisSnapshot | null = await db.analysisSnapshot.findFirst({
    where: { fieldId: field.id },
    orderBy: { runAt: "desc" },
  });

  const stressDaysAvoided =
    advisory.type === "irrigation" && advisory.waterMm > 0 ? (latestSnapshot?.stressDays ?? 0) : 0;

  const computation = computeImpact({
    fieldId: field.id,
    fieldName: field.name,
    cropType: field.cropType,
    areaHa: field.areaHa,
    irrigationMethod: field.irrigationMethod,
    waterMm: advisory.waterMm,
    baselineMm: advisory.baselineMm,
    savedMm: advisory.savedMm,
    periodDays: 7,
    stressDaysAvoided,
    decidedAt,
  });

  for (const rec of computation.records) {
    await db.impactRecord.create({
      data: {
        fieldId: field.id,
        recordedAt: decidedAt,
        metric: rec.metric,
        value: rec.value,
        unit: rec.unit,
        method: rec.method,
        inputsJson: rec.inputsJson,
        periodDays: 7,
      },
    });
  }

  const updated = await db.advisory.update({
    where: { id: advisory.id },
    data: { status: "adopted", decidedAt },
  });

  return {
    advisory: updated,
    impactRecordsCreated: computation.records.length,
    waterLitersSaved: computation.waterLitersSaved,
  };
}

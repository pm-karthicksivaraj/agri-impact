import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runAnalysis } from "@/lib/engine/analysis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/alerts/scan — re-run the analysis + alert rules for every field
 * (used by the "Run checks" button in the alert center).
 */
export async function POST() {
  try {
    const fields = await db.field.findMany({ orderBy: { createdAt: "desc" }, take: 25 });
    let ok = 0;
    let failed = 0;
    let alertCount = 0;
    for (const field of fields) {
      try {
        const result = await runAnalysis(field);
        ok++;
        alertCount += result.alerts.length;
      } catch {
        failed++;
      }
    }
    return NextResponse.json({
      ok,
      failed,
      alertCount,
      message:
        failed > 0
          ? `${ok} fields checked, ${failed} failed (weather service may be busy — try again shortly).`
          : `${ok} fields checked — ${alertCount} active alert(s).`,
    });
  } catch (e) {
    console.error("POST /api/alerts/scan failed", e);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}

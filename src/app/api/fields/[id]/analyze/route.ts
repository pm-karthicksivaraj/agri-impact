import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runAnalysis, AnalysisError } from "@/lib/engine/analysis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const field = await db.field.findUnique({ where: { id } });
    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }
    const result = await runAnalysis(field);
    return NextResponse.json({
      ok: true,
      snapshotId: result.snapshotId,
      current: result.balance.current,
      forecast7: result.balance.forecast7,
      advisories: result.advisories.length,
      alerts: result.alerts.length,
    });
  } catch (e) {
    if (e instanceof AnalysisError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.code === "weather-unavailable" ? 503 : 500 }
      );
    }
    console.error("POST /api/fields/[id]/analyze failed", e);
    return NextResponse.json({ error: "Analysis failed unexpectedly" }, { status: 500 });
  }
}

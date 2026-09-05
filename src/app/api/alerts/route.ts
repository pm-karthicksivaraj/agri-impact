import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCrop } from "@/lib/engine/crops";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fieldId = url.searchParams.get("fieldId");
    const unacknowledged = url.searchParams.get("unacknowledged") === "true";

    const alerts = await db.alertEvent.findMany({
      where: {
        ...(fieldId ? { fieldId } : {}),
        ...(unacknowledged ? { acknowledged: false } : {}),
      },
      orderBy: { triggeredAt: "desc" },
      take: 100,
      include: { field: true },
    });

    return NextResponse.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        fieldId: a.fieldId,
        fieldName: a.field.name,
        cropType: a.field.cropType,
        cropLabel: getCrop(a.field.cropType).label,
        region: a.field.region,
        triggeredAt: a.triggeredAt.toISOString(),
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        metricKey: a.metricKey,
        metricValue: a.metricValue,
        acknowledged: a.acknowledged,
      })),
    });
  } catch (e) {
    console.error("GET /api/alerts failed", e);
    return NextResponse.json({ error: "Failed to load alerts" }, { status: 500 });
  }
}

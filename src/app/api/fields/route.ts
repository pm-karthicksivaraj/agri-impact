import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePolygon, polygonAreaHa, polygonCentroid } from "@/lib/engine/geo";
import { runAnalysis, AnalysisError } from "@/lib/engine/analysis";
import { CROPS, SOILS } from "@/lib/engine/crops";
import { parseSnapshotForecast } from "@/lib/engine/analysis";
import type { Field, AnalysisSnapshot } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  cropType: z.string().refine((v) => v in CROPS, { message: "Unknown crop type" }),
  soilType: z.string().refine((v) => v in SOILS, { message: "Unknown soil type" }),
  growthStage: z.enum(["initial", "development", "mid", "late"]),
  region: z.string().trim().min(2).max(60),
  ownerName: z.string().trim().min(2).max(80),
  ownerRole: z.enum(["farmer", "cooperative", "extension"]).default("farmer"),
  irrigationMethod: z.enum(["pump", "gravity", "canal"]).default("pump"),
  polygon: z.array(z.array(z.number()).length(2)).min(3).max(64),
});

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

export async function listFields(): Promise<FieldListItem[]> {
  const fields = await db.field.findMany({ orderBy: { createdAt: "desc" } });
  const items: FieldListItem[] = [];
  for (const f of fields) {
    const latest = await db.analysisSnapshot.findFirst({
      where: { fieldId: f.id },
      orderBy: { runAt: "desc" },
    });
    const alertCount = await db.alertEvent.count({
      where: { fieldId: f.id, acknowledged: false },
    });
    const pendingAdvisories = await db.advisory.count({
      where: { fieldId: f.id, status: "pending" },
    });
    const parsed = latest ? parseSnapshotForecast(latest) : null;
    items.push({
      id: f.id,
      name: f.name,
      cropType: f.cropType,
      cropLabel: CROPS[f.cropType]?.label ?? f.cropType,
      soilType: f.soilType,
      soilLabel: SOILS[f.soilType]?.label ?? f.soilType,
      growthStage: f.growthStage,
      region: f.region,
      ownerName: f.ownerName,
      ownerRole: f.ownerRole,
      areaHa: Math.round(f.areaHa * 100) / 100,
      centroidLat: f.centroidLat,
      centroidLng: f.centroidLng,
      irrigationMethod: f.irrigationMethod,
      isDemo: f.isDemo,
      polygon: JSON.parse(f.polygonJson) as [number, number][],
      createdAt: f.createdAt.toISOString(),
      latestRunAt: latest?.runAt.toISOString() ?? null,
      currentRootzone: latest?.currentRootzone ?? null,
      currentSurface: latest?.currentSurface ?? null,
      raw: parsed?.current.raw ?? null,
      stressDays: latest?.stressDays ?? null,
      nextIrrigation: latest?.nextIrrigation ?? null,
      alertCount,
      pendingAdvisories,
    });
  }
  return items;
}

export async function GET() {
  try {
    const items = await listFields();
    return NextResponse.json({ fields: items });
  } catch (e) {
    console.error("GET /api/fields failed", e);
    return NextResponse.json({ error: "Failed to list fields" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  let polygon;
  try {
    polygon = normalizePolygon(parsed.data.polygon);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid polygon" },
      { status: 400 }
    );
  }

  const areaHa = polygonAreaHa(polygon);
  if (areaHa < 0.01) {
    return NextResponse.json(
      { error: "Field polygon is too small (min 0.01 ha — zoom in and draw a tighter area)" },
      { status: 400 }
    );
  }
  if (areaHa > 2000) {
    return NextResponse.json(
      { error: "Field polygon is too large (max 2,000 ha per field)" },
      { status: 400 }
    );
  }
  const centroid = polygonCentroid(polygon);

  let field: Field;
  try {
    field = await db.field.create({
      data: {
        name: parsed.data.name,
        cropType: parsed.data.cropType,
        soilType: parsed.data.soilType,
        growthStage: parsed.data.growthStage,
        region: parsed.data.region,
        ownerName: parsed.data.ownerName,
        ownerRole: parsed.data.ownerRole,
        irrigationMethod: parsed.data.irrigationMethod,
        polygonJson: JSON.stringify(polygon),
        areaHa: Math.round(areaHa * 10000) / 10000,
        centroidLat: centroid[0],
        centroidLng: centroid[1],
      },
    });
  } catch (e) {
    console.error("POST /api/fields create failed", e);
    return NextResponse.json({ error: "Failed to save field" }, { status: 500 });
  }

  // run the real analysis pipeline immediately
  let warning: string | null = null;
  try {
    await runAnalysis(field);
  } catch (e) {
    if (e instanceof AnalysisError) {
      warning = `Field saved, but analysis failed: ${e.message}`;
    } else {
      console.error("POST /api/fields analysis failed", e);
      warning = "Field saved, but analysis failed unexpectedly.";
    }
  }

  const items = await listFields();
  const created = items.find((i) => i.id === field.id);
  return NextResponse.json({ field: created, warning }, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { decideAdvisory } from "@/lib/engine/adoption";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({ status: z.enum(["adopted", "dismissed"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "status must be 'adopted' or 'dismissed'" }, { status: 400 });
  }

  try {
    const advisory = await db.advisory.findUnique({ where: { id } });
    if (!advisory) return NextResponse.json({ error: "Advisory not found" }, { status: 404 });
    if (advisory.status !== "pending") {
      return NextResponse.json({ error: "Advisory already decided" }, { status: 409 });
    }
    const field = await db.field.findUnique({ where: { id: advisory.fieldId } });
    if (!field) return NextResponse.json({ error: "Field not found" }, { status: 404 });

    const outcome = await decideAdvisory(advisory, field, parsed.data.status);
    return NextResponse.json({
      advisory: {
        id: outcome.advisory.id,
        status: outcome.advisory.status,
        decidedAt: outcome.advisory.decidedAt?.toISOString() ?? null,
      },
      impactRecordsCreated: outcome.impactRecordsCreated,
      waterLitersSaved: outcome.waterLitersSaved,
    });
  } catch (e) {
    console.error("PATCH /api/advisories/[id] failed", e);
    return NextResponse.json({ error: "Failed to update advisory" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const updated = await db.alertEvent.update({
      where: { id },
      data: { acknowledged: true },
    });
    return NextResponse.json({ id: updated.id, acknowledged: updated.acknowledged });
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    console.error("PATCH /api/alerts/[id] failed", e);
    return NextResponse.json({ error: "Failed to acknowledge alert" }, { status: 500 });
  }
}

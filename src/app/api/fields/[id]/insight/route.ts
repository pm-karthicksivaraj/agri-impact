import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseSnapshotForecast } from "@/lib/engine/analysis";
import { getCrop } from "@/lib/engine/crops";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/fields/[id]/insight
 * Generates a plain-language field brief from the LATEST computed model state.
 * Tries the Z.ai LLM (server-side only) for natural narration; if the AI
 * service is unavailable (e.g. no credentials), falls back to a deterministic
 * template generated from the same real numbers — never fabricated data.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const field = await db.field.findUnique({
    where: { id },
    include: { snapshots: { orderBy: { runAt: "desc" }, take: 1 } },
  });
  if (!field) return NextResponse.json({ error: "Field not found" }, { status: 404 });

  const latest = field.snapshots[0];
  if (!latest) {
    return NextResponse.json({ error: "No analysis yet — run the analysis first" }, { status: 409 });
  }
  const parsed = parseSnapshotForecast(latest);
  if (!parsed) {
    return NextResponse.json({ error: "Snapshot data unreadable" }, { status: 500 });
  }

  const crop = getCrop(field.cropType);
  const numbers = {
    field: field.name,
    crop: crop.label,
    region: field.region,
    areaHa: Math.round(field.areaHa * 100) / 100,
    rootzonePct: parsed.current.rootzone,
    surfacePct: parsed.current.surface,
    stressThresholdPct: parsed.current.raw,
    forecast7: parsed.forecast7,
  };

  // deterministic brief (always truthful — derived from computed model state)
  const fallback = buildDeterministicBrief(numbers, latest.runAt.toISOString());

  try {
    const prompt = [
      "You are an irrigation agronomist writing a 4-6 sentence field brief for a smallholder farmer.",
      "Use ONLY the numbers provided. Plain, warm, practical English. No markdown, no bullet points,",
      "no invented data, no offers. End with one concrete action.",
      JSON.stringify(numbers),
    ].join("\n");

    // z-ai-web-dev-sdk is server-side only; the SDK has no first-class types here
    const mod = (await import("z-ai-web-dev-sdk")) as Record<string, unknown>;
    const ZAI = (mod.default ?? mod) as { create: () => Promise<Record<string, unknown>> };
    const zai = await ZAI.create();
    const client = zai as {
      chat: { completions: { create: (args: unknown) => Promise<{ choices?: { message?: { content?: string } }[] }> } };
    };
    const completion = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "enabled" },
    });
    const text: string | undefined = completion?.choices?.[0]?.message?.content;
    if (text && text.trim().length > 40) {
      return NextResponse.json({ source: "ai", text: text.trim(), generatedAt: new Date().toISOString() });
    }
  } catch (e) {
    console.warn("AI insight unavailable, using deterministic brief:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({
    source: "model",
    text: fallback,
    generatedAt: new Date().toISOString(),
  });
}

function buildDeterministicBrief(
  n: {
    field: string;
    crop: string;
    region: string;
    areaHa: number;
    rootzonePct: number;
    surfacePct: number;
    stressThresholdPct: number;
    forecast7: {
      stressDays: number;
      nextIrrigationDay: number | null;
      irrigationNeedMm: number;
      totalEt0: number;
      totalPrecip: number;
      minRootzone: number;
    };
  },
  runAtIso: string
): string {
  const parts: string[] = [];
  parts.push(
    `${n.field} (${n.crop}, ${n.region}, ${n.areaHa} ha) was analysed on ${runAtIso.slice(0, 10)} using live weather for its exact location.`
  );
  parts.push(
    `Root-zone available water is at ${n.rootzonePct.toFixed(0)}% — the stress threshold for this crop/stage is ${n.stressThresholdPct.toFixed(0)}%. The surface layer reads ${n.surfacePct.toFixed(0)}% and dries much faster, so it can look dry while the crop still has water.`
  );
  if (n.forecast7.nextIrrigationDay !== null && n.forecast7.irrigationNeedMm > 0) {
    parts.push(
      `Over the next 7 days the dry-run forecast shows ${n.forecast7.stressDays} stress day(s): plan to irrigate about ${n.forecast7.irrigationNeedMm} mm${n.forecast7.nextIrrigationDay <= 1 ? " now" : ` in ${n.forecast7.nextIrrigationDay} day(s)`}.`
    );
  } else {
    parts.push(
      `The 7-day forecast keeps root-zone water above the stress threshold (minimum ${n.forecast7.minRootzone.toFixed(0)}%), so skipping a scheduled irrigation this week is safe and saves water and pumping energy.`
    );
  }
  parts.push(
    `Forecast totals: ET0 ${n.forecast7.totalEt0} mm and rain ${n.forecast7.totalPrecip} mm. Check the advisories tab for the decision log, and re-run this analysis after the next rain event.`
  );
  return parts.join(" ");
}

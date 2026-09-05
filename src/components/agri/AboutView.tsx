"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CROPS, SOILS } from "@/lib/engine/crops";
import { CONVENTIONAL_MM_PER_WEEK, GRID_EF_KG_PER_KWH, PUMP_EFFICIENCY, PUMP_HEAD_M, SCORE_WEIGHTS } from "@/lib/engine/constants";
import { FileDown, FlaskConical, Globe2, Scale, TriangleAlert } from "lucide-react";

export function AboutView() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base sm:text-lg font-bold uppercase tracking-widest">Methodology &amp; transparency</h1>
        <p className="text-xs text-muted-foreground leading-relaxed mt-2 max-w-3xl">
          Every number AgriImpact shows is computed from the rules on this page. If a stakeholder disagrees
          with a constant, change it in <code className="text-[10px] bg-muted px-1 py-0.5 rounded">src/lib/engine/constants.ts</code>{" "}
          and every figure — moisture, advisories, impact, SDG progress — moves accordingly, in the open.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-[#2E7F25]" aria-hidden /> The model — FAO-56 dual-bucket water balance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed space-y-3 p-4 pt-1">
          <p>
            Two soil buckets are simulated daily per field. The <b>surface bucket</b> (0–10 cm, capacity =
            (FC−WP)·100 mm) gains effective precipitation and loses bare-soil evaporation at 0.6·ET₀ when wet —
            this is the layer satellite radar sees, and it dries fast. The <b>root-zone bucket</b> (capacity =
            (FC−WP)·rootDepth·1000 mm) gains the same inflow and loses crop evapotranspiration:
          </p>
          <pre className="text-[10px] bg-muted rounded p-3 overflow-x-auto leading-relaxed">
{`ETc = Kc(stage) × ET0                      // FAO-56 crop coefficient
Peff = P − runoff(P, soil)                 // soil-specific + intensity excess
θroot(t+1) = θroot(t) + Peff − ETc          // bounded [WP, FC]
stress begins when depletion > p × TAW      // FAO-56 Table 22 (RAW)`}
          </pre>
          <p>
            The model is <b>initialised from reality, not guesswork</b>: the previous 30 days of observed
            weather at the field&apos;s coordinates are replayed from a field-capacity start, so today&apos;s
            state is dominated by what actually rained and evaporated. The next 7 days use the real forecast
            as a <b>dry-run</b> (no irrigation applied) — stress onset in that window is what triggers
            advisories and alerts. Rice paddies additionally use a stricter near-saturation threshold and
            drainage logic under heavy rain.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-[#2E7F25]" aria-hidden /> Data sources — all open, no API keys
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed space-y-2 p-4 pt-1">
          <ul className="space-y-2">
            <li>
              <b>Weather (observed + forecast):</b> Open-Meteo — daily tmax, precipitation and Penman-Monteith
              ET₀ at the field&apos;s exact coordinates (ERA5-blend reanalysis for the past, ICON/ECMWF for the
              next 7 days). Cached 30 minutes server-side.
            </li>
            <li>
              <b>Map &amp; tiles:</b> Esri World Imagery (Maxar, Earthstar Geographics &amp; the GIS
              User Community) — a true satellite basemap so roads, buildings and crop fields are
              clearly distinguishable when drawing polygons — Leaflet — polygons are drawn by hand
              and measured geodesically (spherical-excess area).
            </li>
            <li>
              <b>Agronomy:</b> FAO-56 (Allen et al., 1998) indicative Kc, root depths and depletion fractions;
              FAO-33-style production functions for yield-stress sensitivity.
            </li>
            <li>
              <b>What is never synthetic:</b> weather, dates, areas, decisions. What is a documented
              assumption: soil hydraulic constants by texture class and the business-as-usual irrigation
              baseline below.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
            <Scale className="h-4 w-4 text-[#2E7F25]" aria-hidden /> Impact methods (the MRV engine)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed space-y-3 p-4 pt-1">
          <p>
            Impact is only recorded when a farmer <b>decides</b> (adopt or explicitly skip an advisory). The
            comparison is always against the conventional fixed-schedule baseline, never against an ideal:
          </p>
          <pre className="text-[10px] bg-muted rounded p-3 overflow-x-auto leading-relaxed">
{`water saved (L)   = (baselineMm − advisoryMm) × area × 10,000
energy avoided    = ρ·g·V·h / (3.6e6·η)      // pump only
CO₂e avoided      = energy × grid EF
yield protection  = stress-days avoided × crop sensitivity`}
          </pre>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead className="text-left">Constant</TableHead>
                  <TableHead className="text-left">Value</TableHead>
                  <TableHead className="text-left">Source / rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="text-[10px]">
                  <TableCell>Pumping lift h</TableCell>
                  <TableCell>{PUMP_HEAD_M} m</TableCell>
                  <TableCell>Typical shallow-aquifer smallholder pump (assumption)</TableCell>
                </TableRow>
                <TableRow className="text-[10px]">
                  <TableCell>Pump efficiency η</TableCell>
                  <TableCell>{PUMP_EFFICIENCY}</TableCell>
                  <TableCell>Small centrifugal pumps, part-load (assumption)</TableCell>
                </TableRow>
                <TableRow className="text-[10px]">
                  <TableCell>Grid emission factor</TableCell>
                  <TableCell>{GRID_EF_KG_PER_KWH} kgCO₂/kWh</TableCell>
                  <TableCell>IGES Grid EF list, Vietnam 2019 average — replace per country</TableCell>
                </TableRow>
                <TableRow className="text-[10px]">
                  <TableCell>Score weights</TableCell>
                  <TableCell>
                    water {SCORE_WEIGHTS.water} · stress {SCORE_WEIGHTS.stress} · adoption{" "}
                    {SCORE_WEIGHTS.adoption} · energy {SCORE_WEIGHTS.energy}
                  </TableCell>
                  <TableCell>Deliberate, displayed in the UI; sum = 1</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="overflow-x-auto">
            <p className="text-[10px] text-muted-foreground mb-1.5">
              Conventional irrigation baseline (mm/week) — the business-as-usual schedule savings are measured
              against:
            </p>
            <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead className="text-left">Crop</TableHead>
                  <TableHead className="text-left">Baseline mm/wk</TableHead>
                  <TableHead className="text-left">Kc (ini/mid/late)</TableHead>
                  <TableHead className="text-left">Root depth</TableHead>
                  <TableHead className="text-left">Stress coeff. p</TableHead>
                  <TableHead className="text-left">Yield loss /stress-day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(CROPS).map((c) => (
                  <TableRow key={c.id} className="text-[10px]">
                    <TableCell className="font-bold">{c.label}</TableCell>
                    <TableCell>{CONVENTIONAL_MM_PER_WEEK[c.id] ?? 30}</TableCell>
                    <TableCell>
                      {c.kc.initial}/{c.kc.mid}/{c.kc.late}
                    </TableCell>
                    <TableCell>
                      {c.rootDepthM.initial}–{c.rootDepthM.mid} m
                    </TableCell>
                    <TableCell>{c.p}</TableCell>
                    <TableCell>{(c.yieldLossPerStressDay * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="overflow-x-auto">
            <p className="text-[10px] text-muted-foreground mb-1.5">Soil water constants by texture (FAO-56 indicative):</p>
            <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead className="text-left">Soil</TableHead>
                  <TableHead className="text-left">FC (m³/m³)</TableHead>
                  <TableHead className="text-left">WP (m³/m³)</TableHead>
                  <TableHead className="text-left">Runoff fraction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(SOILS).map((s) => (
                  <TableRow key={s.id} className="text-[10px]">
                    <TableCell className="font-bold">{s.label}</TableCell>
                    <TableCell>{s.fc}</TableCell>
                    <TableCell>{s.wp}</TableCell>
                    <TableCell>{s.runoffFraction}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-[#C9971E]" aria-hidden /> Known limitations (stated, not hidden)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed p-4 pt-1">
          <ul className="space-y-2 list-disc pl-4">
            <li>
              Soil state is <b>modelled</b> from weather + texture-class constants, not measured in-situ.
              Point-scale truth needs soil sensors or satellite assimilation — the integration point is
              designed in the roadmap.
            </li>
            <li>
              The 7-day forecast inherits weather-model uncertainty (ICON/ECMWF). The shaded forecast band and
              the dry-run label make this visible rather than hiding it.
            </li>
            <li>
              Yield protection uses FAO-33-style sensitivity coefficients — a planning estimate of avoided
              loss, not a harvested measurement. Harvest-data calibration is the v2 upgrade path.
            </li>
            <li>
              Impact is attributed per adopted decision window (7 days). Season-cumulative MRV with control
              plots is the next milestone.
            </li>
            <li>
              No user authentication in v1 — all data is shared demo data. The stakeholder views are views,
              not access controls.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
            <FileDown className="h-4 w-4 text-[#2E7F25]" aria-hidden /> Reproducibility
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed p-4 pt-1">
          <p>
            The full MRV ledger, with per-entry methods and JSON provenance (inputs, constants, decision
            timestamps), exports as CSV from the Impact dashboard. The engine is pure TypeScript in{" "}
            <code className="text-[10px] bg-muted px-1 py-0.5 rounded">src/lib/engine/</code> — unit-testable,
            deterministic, and open to inspection in the repository.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

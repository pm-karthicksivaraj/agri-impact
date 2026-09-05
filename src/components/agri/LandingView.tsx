"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Droplets,
  FileDown,
  Globe2,
  Layers,
  MapPin,
  Pencil,
  Radar,
  Recycle,
  ScanSearch,
  Sprout,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useImpact, useFields } from "@/hooks/useAgriData";
import { useAppStore } from "@/lib/store";
import { fmtLiters, fmtNum } from "./status";

const STEPS = [
  {
    icon: Pencil,
    title: "1 · Map the field",
    text: "Draw the polygon on a real satellite-street map. Area, centroid and location are computed geodesically — no hardware, no survey crew.",
  },
  {
    icon: ScanSearch,
    title: "2 · Model the soil",
    text: "30 days of observed weather for that exact location are replayed through an FAO-56 dual-bucket model, giving today's surface and root-zone water state.",
  },
  {
    icon: Radar,
    title: "3 · See 7 days ahead",
    text: "The real forecast runs as a dry-run: if the farmer does nothing, when does stress begin? That's what the advisory answers.",
  },
  {
    icon: BarChart3,
    title: "4 · Measure the impact",
    text: "Every adopt/skip decision is converted into water, energy, CO₂e and yield-protection entries in an auditable MRV ledger.",
  },
];

const FEATURES = [
  {
    icon: MapPin,
    title: "Field registry & mapping",
    text: "Geodesic areas, per-field location weather, soil and crop parameters from FAO-56 tables.",
  },
  {
    icon: Layers,
    title: "Dual-layer moisture",
    text: "Surface (0–10 cm, what radar sees) AND root zone (what the crop drinks). No more top-5cm blind spots.",
  },
  {
    icon: Droplets,
    title: "Irrigation advisories",
    text: "Exact mm, day and volume to apply — or an explicit, recorded decision to hold off and save the water.",
  },
  {
    icon: TriangleAlert,
    title: "Alert rule engine",
    text: "Drought-stress, heavy-rain (paddy drainage) and heat-during-flowering alerts re-checked on every run.",
  },
  {
    icon: Recycle,
    title: "MRV impact ledger",
    text: "Water liters, pump kWh, grid CO₂e and yield protection — every row with its method and provenance.",
  },
  {
    icon: Users,
    title: "Three stakeholder views",
    text: "Farmer decisions, cooperative aggregation, province/policy roll-ups — same audited numbers.",
  },
  {
    icon: FileDown,
    title: "One-click reporting",
    text: "CSV export of summary, per-field metrics and the full ledger for funders and government MRV.",
  },
  {
    icon: Sprout,
    title: "Open, honest model",
    text: "Free weather APIs, documented constants, visible equations, stated limitations. No black boxes.",
  },
];

export function LandingView() {
  const setView = useAppStore((s) => s.setView);
  const { data } = useImpact();
  const { fields } = useFields();
  const hasData = !!data && data.summary.totals.fields > 0;

  const stressFields = (fields ?? []).filter(
    (f) => f.currentRootzone !== null && f.raw !== null && f.currentRootzone < f.raw
  ).length;

  return (
    <div className="space-y-8">
      {/* hero */}
      <section className="field-grid rounded-lg border border-border bg-card p-6 sm:p-10 relative overflow-hidden">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#2E7F25] dark:text-[#55B54A] font-bold">
            open data · no api keys · mrv-grade
          </p>
          <h1 className="mt-4 text-2xl sm:text-4xl font-bold leading-tight">
            See the water beneath.
            <br />
            <span className="text-[#2E7F25] dark:text-[#55B54A]">Prove the impact.</span>
          </h1>
          <p className="mt-4 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-2xl">
            AgriImpact maps your field, forecasts root-zone soil moisture on live weather, tells you exactly
            when to irrigate — then <span className="font-bold text-foreground">measures</span> the water,
            energy, carbon and yield impact of every decision in an auditable ledger. Not just tech: proof.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <Button onClick={() => setView("map")} size="lg" className="min-h-11">
              <MapPin className="h-4 w-4 mr-1" aria-hidden /> Draw your field
            </Button>
            <Button onClick={() => setView("about")} size="lg" variant="outline" className="min-h-11">
              How the model works
            </Button>
          </div>
        </div>

        {/* live status terminal */}
        <div className="mt-8 sm:mt-10 rounded-md border border-border bg-background/80 backdrop-blur p-4 sm:p-5 max-w-xl">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#2E7F25] animate-pulse" aria-hidden />
            live platform status
          </p>
          {hasData ? (
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] tick-in">
              <Stat label="fields monitored" value={fmtNum(data!.summary.totals.fields)} />
              <Stat label="area covered" value={`${data!.summary.totals.areaHa} ha`} />
              <Stat label="root-zone stress now" value={`${stressFields} field(s)`} />
              <Stat label="advisory adoption" value={`${data!.summary.totals.adoptionRatePct}%`} />
              <Stat label="water saved" value={fmtLiters(data!.summary.totals.waterLitersSaved)} tone />
              <Stat label="CO₂e avoided" value={`${fmtNum(Math.round(data!.summary.totals.co2KgAvoided))} kg`} tone />
              <div className="col-span-2 mt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>sustainability score</span>
                  <span className="font-bold text-foreground">{data!.summary.score.overall.toFixed(0)}/100</span>
                </div>
                <Progress value={data!.summary.score.overall} className="h-1.5 mt-1" />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
              No fields yet — load the demo dataset from the header (6 real Vietnamese smallholder fields,
              analysed against live weather) or draw your own.
            </p>
          )}
        </div>
      </section>

      {/* why it's different */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#2E7F25]" aria-hidden /> Root-zone truth
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed p-4 pt-1">
            Satellite radar sees the top ~5 cm — a field can look “dry” while the roots drink fine (or vice
            versa). We model the <span className="font-bold text-foreground">root zone</span> with FAO-56
            water balance and show both layers side by side.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
              <Radar className="h-4 w-4 text-[#2E7F25]" aria-hidden /> Predictive, not descriptive
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed p-4 pt-1">
            The 7-day forecast is a <span className="font-bold text-foreground">dry-run simulation</span>:
            stress day X is predicted before it happens, so irrigation happens at the right time with the
            right depth — never on a fixed calendar.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#2E7F25]" aria-hidden /> Impact you can audit
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed p-4 pt-1">
            “Saves water” is a claim. An <span className="font-bold text-foreground">MRV ledger</span> with
            per-entry methods, input provenance, baseline definitions and exportable reports is evidence —
            for co-ops, governments and funders.
          </CardContent>
        </Card>
      </section>

      {/* how it works */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <Card key={s.title}>
              <CardContent className="p-4">
                <s.icon className="h-5 w-5 text-[#2E7F25] dark:text-[#55B54A]" aria-hidden />
                <h3 className="text-xs font-bold mt-2.5 uppercase tracking-wider">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* features */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3">Everything in the box</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-4">
                <f.icon className="h-4 w-4 text-[#2E7F25] dark:text-[#55B54A]" aria-hidden />
                <h3 className="text-xs font-bold mt-2.5">{f.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* stakeholders */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3">Built for every stakeholder</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Sprout,
              title: "Smallholder farmers",
              text: "Free, no-hardware soil water visibility. Plain-language advisories: irrigate X mm on day Y — or safely skip and save the pumping cost.",
            },
            {
              icon: Users,
              title: "Cooperatives & agribusiness",
              text: "Aggregate member water savings, adoption behaviour and stress hot-spots. One CSV for the sustainability report.",
            },
            {
              icon: Globe2,
              title: "Government & projects",
              text: "Province-level SDG 6.4 / 2.3 indicators computed from an auditable method — defensible numbers for climate finance and extension programs.",
            },
          ].map((s) => (
            <Card key={s.title} className="border-[#2E7F25]/30">
              <CardContent className="p-5">
                <s.icon className="h-5 w-5 text-[#2E7F25] dark:text-[#55B54A]" aria-hidden />
                <h3 className="text-xs font-bold mt-2.5 uppercase tracking-wider">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-lg border border-[#2E7F25]/40 bg-[#E9F5E6] dark:bg-[#131F0E] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider">Ready to measure, not guess?</h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-xl">
            One click loads six demo fields — real places, live weather, genuine model output. Or draw your
            own field anywhere on Earth.
          </p>
        </div>
        <Button size="lg" onClick={() => setView("map")} className="min-h-11 shrink-0">
          Open the map <ArrowRight className="h-4 w-4 ml-1" aria-hidden />
        </Button>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${tone ? "text-[#2E7F25] dark:text-[#55B54A]" : ""}`}>{value}</span>
    </div>
  );
}

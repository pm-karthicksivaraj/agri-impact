"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  Download,
  Droplets,
  Globe2,
  Leaf,
  Lightbulb,
  Recycle,
  Sprout,
  Users,
  Zap,
} from "lucide-react";
import { useImpact } from "@/hooks/useAgriData";
import { useAppStore } from "@/lib/store";
import { StatCard, StatSkeleton } from "./StatCard";
import { fmtDate, fmtLiters, fmtNum } from "./status";

const METRIC_LABELS: Record<string, string> = {
  water_liters_saved: "Water saved",
  energy_kwh_avoided: "Energy avoided",
  co2_kg_avoided: "CO₂e avoided",
  yield_protection_pct: "Yield protection",
};

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border rounded-md bg-card p-2.5 text-[10px] shadow-lg">
      <p className="font-bold">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold">
            {p.name === "Water saved" ? fmtLiters(p.value) : `${fmtNum(Math.round(p.value))} ${unit}`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function ImpactView() {
  const { data, error, loading } = useImpact();
  const setView = useAppStore((s) => s.setView);
  const openField = useAppStore((s) => s.openField);
  const [scope, setScope] = useState<"farmer" | "coop" | "gov">("farmer");

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-xs text-[#B3491F]">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.summary.totals.fields === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Leaf className="h-10 w-10 mx-auto text-[#2E7F25] dark:text-[#55B54A]" aria-hidden />
          <h2 className="mt-3 text-sm font-bold uppercase tracking-widest">No impact data yet</h2>
          <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Impact is generated when advisories are adopted. Map fields and decide advisories first — or load
            the demo dataset to see the full MRV pipeline on live weather.
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button size="sm" onClick={() => setView("map")}>
              <Sprout className="h-4 w-4 mr-1" aria-hidden /> Map a field
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { summary, perField, groupByRegion, groupByOwner, records } = data;
  const t = summary.totals;

  const fieldChart = perField
    .slice()
    .sort((a, b) => b.waterLitersSaved - a.waterLitersSaved)
    .map((f) => ({
      name: f.fieldName.split("—")[0].trim().slice(0, 16),
      baseline: f.advisoryBaselineMm,
      advisory: f.advisoryWaterMm,
      saved: f.waterLitersSaved,
    }));

  const scopeData = scope === "gov" ? groupByRegion : scope === "coop" ? groupByOwner : [];
  const scopeChart = scopeData.map((g) => ({
    name: g.label.slice(0, 18),
    saved: g.waterLitersSaved,
    fields: g.fields,
  }));

  return (
    <div className="space-y-4">
      {/* scope selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="farmer" className="text-[11px] gap-1">
              <Sprout className="h-3.5 w-3.5" aria-hidden /> Farmer view
            </TabsTrigger>
            <TabsTrigger value="coop" className="text-[11px] gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden /> Cooperative view
            </TabsTrigger>
            <TabsTrigger value="gov" className="text-[11px] gap-1">
              <Globe2 className="h-3.5 w-3.5" aria-hidden /> Region / policy view
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" variant="outline" asChild>
          <a href="/api/export" download>
            <Download className="h-4 w-4 mr-1" aria-hidden /> Export MRV report (CSV)
          </a>
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={scope === "gov" ? "Water saved — region" : scope === "coop" ? "Water saved — members" : "Water saved"}
          value={fmtLiters(t.waterLitersSaved)}
          hint={`${fmtNum(t.waterLitersPerHa)} L/ha · ${t.waterUseEfficiencyGainPct}% vs conventional schedule`}
          icon={Droplets}
          tone="banana"
        />
        <StatCard
          label="Pumping energy avoided"
          value={fmtNum(Math.round(t.energyKwhAvoided))}
          unit="kWh"
          hint="10 m lift · 40% pump efficiency · gravity systems excluded"
          icon={Zap}
        />
        <StatCard
          label="Emissions avoided"
          value={fmtNum(Math.round(t.co2KgAvoided))}
          unit="kgCO₂e"
          hint="grid EF 0.6538 kg/kWh (IGES, VN-2019)"
          icon={Recycle}
        />
        <StatCard
          label="Advisory adoption"
          value={`${t.adoptionRatePct}`}
          unit="%"
          hint={`${t.fields} fields · ${t.areaHa} ha · model yield protection avg ${t.yieldProtectionAvgPct}%`}
          icon={Lightbulb}
          tone="wheat"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* baseline vs advisory per field */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#2E7F25]" aria-hidden /> Adopted plans vs conventional schedule
            </CardTitle>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Irrigation depth per field over the decided advisory windows (mm). The gap between the bars is
              where the savings come from.
            </p>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-1">
            <div style={{ width: "100%", height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fieldChart} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#8B9683" strokeOpacity={0.2} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 8, fill: "currentColor" }}
                    className="text-muted-foreground"
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={44}
                  />
                  <YAxis tick={{ fontSize: 9, fill: "currentColor" }} className="text-muted-foreground" unit=" mm" />
                  <Tooltip content={<ChartTooltip unit="mm" />} cursor={{ fill: "#2E7F25", fillOpacity: 0.08 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v: string) => <span className="text-muted-foreground">{v}</span>} />
                  <Bar dataKey="baseline" name="Conventional" fill="#C9971E" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="advisory" name="Advisory plan" fill="#2E7F25" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* score + SDG */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest">Sustainability score</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-[#2E7F25] dark:text-[#55B54A]">
                  {summary.score.overall.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">/ 100 · weighted composite</p>
              </div>
              <div className="mt-3 space-y-2.5">
                {summary.score.components.map((c) => (
                  <div key={c.key}>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">
                        {c.label} <span className="opacity-60">(×{c.weight})</span>
                      </span>
                      <span className="font-bold">{c.value.toFixed(0)}</span>
                    </div>
                    <Progress value={c.value} className="h-1.5 mt-1" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                Weights are fixed and shown on purpose: water 0.35, stress 0.25, adoption 0.25, energy 0.15.
                Change any assumption in the Methodology page and the score moves transparently.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest">SDG alignment</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              {summary.sdg.map((s) => (
                <div key={`${s.goal}-${s.target}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-bold">
                      SDG {s.goal} · {s.target}
                    </Badge>
                    <span className="text-[10px] font-bold ml-auto">{s.progressPct.toFixed(0)}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{s.label}</p>
                  <Progress value={s.progressPct} className="h-1.5 mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{s.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* scope-specific grouping chart */}
      {scope !== "farmer" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
              <Users className="h-4 w-4 text-[#2E7F25]" aria-hidden />
              {scope === "gov" ? "Water saved by province" : "Water saved by member / owner"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-1">
            <div style={{ width: "100%", height: Math.max(140, scopeChart.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scopeChart} layout="vertical" margin={{ top: 4, right: 12, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#8B9683" strokeOpacity={0.2} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "currentColor" }} className="text-muted-foreground" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 9, fill: "currentColor" }}
                    className="text-muted-foreground"
                    width={120}
                  />
                  <Tooltip content={<ChartTooltip unit="L" />} cursor={{ fill: "#2E7F25", fillOpacity: 0.08 }} />
                  <Bar dataKey="saved" name="Water saved" radius={[0, 3, 3, 0]}>
                    {scopeChart.map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? "#2E7F25" : "#77B85C"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-[10px] min-w-[420px]">
                <thead>
                  <tr className="text-muted-foreground text-left border-b border-border">
                    <th className="py-2 pr-2 font-normal">{scope === "gov" ? "province" : "member"}</th>
                    <th className="py-2 pr-2 font-normal text-right">fields</th>
                    <th className="py-2 pr-2 font-normal text-right">area (ha)</th>
                    <th className="py-2 pr-2 font-normal text-right">water saved</th>
                    <th className="py-2 font-normal text-right">CO₂e avoided</th>
                  </tr>
                </thead>
                <tbody>
                  {scopeData.map((g) => (
                    <tr key={g.label} className="border-b border-border/50">
                      <td className="py-2 pr-2 font-bold">{g.label}</td>
                      <td className="py-2 pr-2 text-right">{g.fields}</td>
                      <td className="py-2 pr-2 text-right">{g.areaHa.toFixed(1)}</td>
                      <td className="py-2 pr-2 text-right font-bold text-[#2E7F25] dark:text-[#55B54A]">
                        {fmtLiters(g.waterLitersSaved)}
                      </td>
                      <td className="py-2 text-right">{g.co2KgAvoided.toFixed(1)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* full ledger */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#2E7F25]" aria-hidden /> Impact ledger — MRV audit trail
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">{records.length} most recent entries</p>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            One row per measured metric with its method. Click a field name to inspect the field.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96 px-4 pb-4">
            <table className="w-full text-[10px] min-w-[680px]">
              <thead>
                <tr className="text-muted-foreground text-left border-b border-border sticky top-0 bg-card">
                  <th className="py-2 pr-2 font-normal">recorded</th>
                  <th className="py-2 pr-2 font-normal">field</th>
                  <th className="py-2 pr-2 font-normal">metric</th>
                  <th className="py-2 pr-2 font-normal text-right">value</th>
                  <th className="py-2 font-normal">method</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(r.recordedAt)}</td>
                    <td className="py-2 pr-2">
                      <button
                        className="font-bold hover:underline text-left"
                        onClick={() => openField(r.fieldId)}
                      >
                        {r.fieldName}
                      </button>
                    </td>
                    <td className="py-2 pr-2">{METRIC_LABELS[r.metric] ?? r.metric}</td>
                    <td className="py-2 pr-2 text-right font-bold whitespace-nowrap">
                      {r.metric === "water_liters_saved"
                        ? fmtLiters(r.value)
                        : r.metric === "yield_protection_pct"
                          ? `${r.value.toFixed(1)}%`
                          : `${fmtNum(Math.round(r.value * 10) / 10)} ${r.unit}`}
                    </td>
                    <td className="py-2 text-muted-foreground leading-snug">{r.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

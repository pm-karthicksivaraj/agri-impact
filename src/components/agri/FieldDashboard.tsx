"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Activity,
  CheckCircle2,
  Droplets,
  Layers,
  Leaf,
  ListChecks,
  MapPin,
  RefreshCw,
  Sprout,
  Trash2,
  TriangleAlert,
  User,
  Wind,
  XCircle,
  Zap,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useFieldDetail } from "@/hooks/useAgriData";
import { Gauge } from "./Gauge";
import { MoistureChart } from "./MoistureChart";
import { StatCard, StatSkeleton } from "./StatCard";
import { SEVERITY_CLASSES, fmtDate, fmtDateTime, fmtLiters, fmtNum } from "./status";

const METRIC_LABELS: Record<string, string> = {
  water_liters_saved: "Water saved",
  energy_kwh_avoided: "Energy avoided",
  co2_kg_avoided: "CO₂e avoided",
  yield_protection_pct: "Yield protection",
};

export function FieldDashboardView() {
  const selectedFieldId = useAppStore((s) => s.selectedFieldId);
  const setView = useAppStore((s) => s.setView);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const { toast } = useToast();
  const { detail, error, loading, reload } = useFieldDetail(selectedFieldId);

  const [analyzing, setAnalyzing] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefSource, setBriefSource] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  if (!selectedFieldId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Sprout className="h-10 w-10 mx-auto text-[#2E7F25] dark:text-[#55B54A]" aria-hidden />
          <h2 className="mt-3 text-sm font-bold uppercase tracking-widest">No field selected</h2>
          <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Pick a field on the map or in the registry to open its moisture forecast, advisories and impact
            ledger.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setView("map")}>
            <MapPin className="h-4 w-4 mr-1" aria-hidden /> Go to the map
          </Button>
        </CardContent>
      </Card>
    );
  }

  const runAnalysis = async () => {
    if (!selectedFieldId || analyzing) return;
    setAnalyzing(true);
    try {
      const res = await api.analyzeField(selectedFieldId);
      await reload();
      toast({
        title: "Analysis refreshed",
        description: `Live weather fetched · ${res.advisories} advisories · ${res.alerts} active alerts.`,
      });
    } catch (e) {
      toast({
        title: "Analysis failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const decide = async (id: string, status: "adopted" | "dismissed") => {
    if (deciding) return;
    setDeciding(id);
    try {
      const res = await api.decideAdvisory(id, status);
      bumpRefresh();
      await reload();
      if (status === "adopted") {
        toast({
          title: "Advisory adopted — impact recorded",
          description:
            res.impactRecordsCreated > 0
              ? `${res.impactRecordsCreated} MRV ledger entries written · ${fmtLiters(res.waterLitersSaved)} water saved vs conventional schedule.`
              : "No measurable difference vs the conventional schedule this time.",
        });
      } else {
        toast({ title: "Advisory dismissed", description: "Kept in the decision log; no impact claimed." });
      }
    } catch (e) {
      toast({
        title: "Decision failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeciding(null);
    }
  };

  const getBrief = async () => {
    if (!selectedFieldId || briefLoading) return;
    setBriefLoading(true);
    try {
      const res = await api.getFieldInsight(selectedFieldId);
      setBrief(res.text);
      setBriefSource(res.source);
    } catch (e) {
      toast({
        title: "Brief failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBriefLoading(false);
    }
  };

  const deleteField = async () => {
    if (!selectedFieldId) return;
    try {
      await api.deleteField(selectedFieldId);
      bumpRefresh();
      useAppStore.setState({ selectedFieldId: null, view: "map" });
      toast({ title: "Field deleted", description: "All related records removed." });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (loading && !detail) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-xs text-[#B3491F]">{error ?? "Field not found."}</p>
        </CardContent>
      </Card>
    );
  }

  const { field, snapshot, advisories, alerts, impactRecords } = detail;
  const forecast = snapshot?.forecast ?? null;
  const threshold = forecast?.current.raw ?? 50;
  const pending = advisories.filter((a) => a.status === "pending");
  const decided = advisories.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-4">
      {/* header */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight">{field.name}</h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Sprout className="h-3 w-3" aria-hidden /> {field.cropLabel}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Layers className="h-3 w-3" aria-hidden /> {field.soilLabel}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{field.growthStageLabel}</Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <MapPin className="h-3 w-3" aria-hidden /> {field.region}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <User className="h-3 w-3" aria-hidden /> {field.ownerName}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{field.areaHa} ha</Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Droplets className="h-3 w-3" aria-hidden /> {field.irrigationMethod}
                </Badge>
              </div>
              {snapshot ? (
                <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                  model {snapshot.modelVersion} · weather: {snapshot.weatherSource} · run {fmtDateTime(snapshot.runAt)}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={runAnalysis} disabled={analyzing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${analyzing ? "animate-spin" : ""}`} aria-hidden />
                {analyzing ? "Analysing…" : "Re-run analysis"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-[#B3491F] dark:text-[#E0703F]">
                    <Trash2 className="h-4 w-4 mr-1" aria-hidden /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm">Delete “{field.name}”?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs leading-relaxed">
                      Removes the field and every snapshot, advisory, alert and impact-ledger entry tied to it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void deleteField()}>Delete field</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="status">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="status" className="text-[11px] gap-1">
            <Activity className="h-3.5 w-3.5" aria-hidden /> Status & forecast
          </TabsTrigger>
          <TabsTrigger value="advisories" className="text-[11px] gap-1">
            <ListChecks className="h-3.5 w-3.5" aria-hidden /> Advisories
            {pending.length > 0 ? (
              <span className="ml-1 text-[9px] bg-[#2E7F25] text-white rounded-full px-1.5">{pending.length}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-[11px] gap-1">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Alerts
            {alerts.filter((a) => !a.acknowledged).length > 0 ? (
              <span className="ml-1 text-[9px] bg-[#B3491F] text-white rounded-full px-1.5">
                {alerts.filter((a) => !a.acknowledged).length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="impact" className="text-[11px] gap-1">
            <Leaf className="h-3.5 w-3.5" aria-hidden /> Field impact
            {impactRecords.length > 0 ? (
              <span className="ml-1 text-[9px] bg-[#3C8C7C] text-white rounded-full px-1.5">{impactRecords.length}</span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* --- status tab --- */}
        <TabsContent value="status" className="mt-4 space-y-4">
          {!snapshot || !forecast ? (
            <Card>
              <CardContent className="p-6 text-xs text-muted-foreground">
                No analysis yet — run the analysis to fetch live weather.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  label="Root-zone water"
                  value={`${Math.round(forecast.current.rootzone)}`}
                  unit="% AWC"
                  tone={forecast.current.rootzone < threshold ? "rust" : forecast.current.rootzone < threshold + 10 ? "wheat" : "banana"}
                  hint={`stress below ${threshold}% · volumetric ${forecast.current.rootzoneVolumetric.toFixed(2)} m³/m³`}
                  icon={Droplets}
                />
                <StatCard
                  label="Surface (0–10 cm)"
                  value={`${Math.round(forecast.current.surface)}`}
                  unit="% AWC"
                  hint="the layer satellite radar sees — dries fast"
                  icon={Wind}
                />
                <StatCard
                  label="Stress days ahead"
                  value={`${forecast.forecast7.stressDays}`}
                  unit="/ 7 days"
                  tone={forecast.forecast7.stressDays > 0 ? "rust" : "banana"}
                  hint={`min root-zone ${forecast.forecast7.minRootzone}% if no action`}
                  icon={TriangleAlert}
                />
                <StatCard
                  label="Irrigation need"
                  value={
                    forecast.forecast7.nextIrrigationDay !== null
                      ? `${forecast.forecast7.irrigationNeedMm}`
                      : "0"
                  }
                  unit="mm"
                  tone={forecast.forecast7.nextIrrigationDay !== null ? "wheat" : "banana"}
                  hint={
                    forecast.forecast7.nextIrrigationDay !== null
                      ? `advised ${forecast.forecast7.nextIrrigationDay <= 1 ? "now" : `in ${forecast.forecast7.nextIrrigationDay} day(s)`} · ${fmtNum(
                          Math.round(forecast.forecast7.irrigationNeedMm * field.areaHa * 10)
                        )} kL for this field`
                      : "soil water stays above threshold — hold"
                  }
                  icon={Zap}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-4">
                <Card className="xl:w-56">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest">Soil status</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-row xl:flex-col justify-around gap-2 p-4 pt-2">
                    <Gauge
                      value={forecast.current.rootzone}
                      threshold={threshold}
                      label="Root zone"
                      sub={`${forecast.soil.rootDepthM} m depth · PAW ${forecast.soil.paw} mm`}
                      size={120}
                    />
                    <Gauge
                      value={forecast.current.surface}
                      threshold={threshold}
                      label="Surface"
                      sub="0–10 cm layer (radar-visible)"
                      size={120}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest">
                      Available water — past 14 days &amp; 7-day dry-run forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4 pt-2">
                    <MoistureChart series={forecast.series} threshold={threshold} height={260} />
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-2 px-2">
                      The forecast is a <span className="font-bold">dry-run</span>: what happens if nothing is
                      done. Rain bars use real Open-Meteo forecast precipitation; the shaded band marks the
                      forecast window.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* weather strip */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-widest">7-day weather at field location</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="whitespace-nowrap px-4 pb-3">
                    <div className="flex gap-2 w-max">
                      {forecast.series
                        .filter((p) => p.phase === "forecast")
                        .slice(0, 7)
                        .map((p) => (
                          <div
                            key={p.date}
                            className={`border rounded-md p-2.5 min-w-[86px] ${
                              p.stressed ? "border-[#EEC4AE]" : "border-border"
                            }`}
                          >
                            <p className="text-[10px] font-bold">{fmtDate(p.date).slice(0, 6)}</p>
                            <p className="text-sm font-bold mt-1">{Math.round(p.tmax)}°C</p>
                            <p className="text-[10px] text-muted-foreground">max temp</p>
                            <p className="text-sm font-bold mt-1 text-[#3C8C7C] dark:text-[#62B5A4]">
                              {p.precip.toFixed(1)} mm
                            </p>
                            <p className="text-[10px] text-muted-foreground">rain · ET0 {p.et0.toFixed(1)}</p>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* --- advisories tab --- */}
        <TabsContent value="advisories" className="mt-4 space-y-4">
          {advisories.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-xs text-muted-foreground">
                No advisories yet — run the analysis first.
              </CardContent>
            </Card>
          ) : (
            <>
              {pending.map((a) => (
                <Card key={a.id} className="border-[#2E7F25]/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge className="text-[9px] uppercase tracking-wider mb-1.5" variant="default">
                          {a.type} · pending decision
                        </Badge>
                        <h3 className="text-sm font-bold leading-snug">{a.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{a.detail}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>plan: <span className="font-bold text-foreground">{a.waterMm} mm</span></span>
                          <span>
                            conventional: <span className="font-bold text-foreground">{a.baselineMm} mm</span>
                          </span>
                          {a.savedMm > 0 ? (
                            <span className="text-[#2E7F25] dark:text-[#55B54A]">
                              saves <span className="font-bold">{a.savedMm} mm</span> ≈{" "}
                              {fmtLiters(a.savedMm * field.areaHa * 10000)}
                            </span>
                          ) : null}
                          <span>window: {a.windowDay ? fmtDate(a.windowDay) : "this week"}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => void decide(a.id, "adopted")}
                          disabled={deciding === a.id}
                          className="min-w-[92px]"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" aria-hidden />
                          {deciding === a.id ? "…" : "Adopt"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void decide(a.id, "dismissed")}
                          disabled={deciding === a.id}
                          className="min-w-[92px]"
                        >
                          <XCircle className="h-4 w-4 mr-1" aria-hidden /> Dismiss
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {decided.map((a) => (
                <Card key={a.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase tracking-wider mb-1.5 ${
                            a.status === "adopted"
                              ? "border-[#BCDDB4] text-[#1E5A18] dark:text-[#9AD37F]"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {a.status} {a.decidedAt ? fmtDate(a.decidedAt) : ""}
                        </Badge>
                        <h3 className="text-sm font-bold leading-snug">{a.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{a.detail}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* AI / model field brief */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest">Field brief</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {brief ? (
                <div className="tick-in">
                  <p className="text-xs leading-relaxed">{brief}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    source: {briefSource === "ai" ? "AI narration (numbers from the model)" : "deterministic model brief"} ·
                    derived from the latest computed snapshot
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A plain-language summary of the latest computed state, narrated from the model numbers (AI
                  narration when available, deterministic text otherwise — never invented data).
                </p>
              )}
              <Button size="sm" variant="secondary" className="mt-3" onClick={getBrief} disabled={briefLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${briefLoading ? "animate-spin" : ""}`} aria-hidden />
                {briefLoading ? "Writing…" : brief ? "Regenerate brief" : "Generate brief"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- alerts tab --- */}
        <TabsContent value="alerts" className="mt-4 space-y-3">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-xs text-muted-foreground">
                No alerts for this field. Rules re-evaluate on every analysis run.
              </CardContent>
            </Card>
          ) : (
            alerts.map((al) => (
              <Card key={al.id} className={al.acknowledged ? "opacity-70" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                            SEVERITY_CLASSES[al.severity] ?? SEVERITY_CLASSES.info
                          }`}
                        >
                          {al.severity}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{al.type}</span>
                      </div>
                      <h3 className="text-sm font-bold mt-1.5">{al.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{al.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">{fmtDateTime(al.triggeredAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* --- field impact tab --- */}
        <TabsContent value="impact" className="mt-4 space-y-4">
          {impactRecords.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-xs text-muted-foreground leading-relaxed">
                No impact recorded for this field yet. Adopt an advisory (or follow a “hold irrigation”
                recommendation) and the measured water, energy, carbon and yield-protection impact will be
                written to the MRV ledger here.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(METRIC_LABELS).map(([metric, label]) => {
                const total = impactRecords
                  .filter((r) => r.metric === metric)
                  .reduce((s, r) => s + r.value, 0);
                return (
                  <StatCard
                    key={metric}
                    label={label}
                    value={metric === "water_liters_saved" ? fmtLiters(total) : metric === "yield_protection_pct" ? total.toFixed(1) : fmtNum(Math.round(total))}
                    unit={metric === "water_liters_saved" ? "" : metric === "yield_protection_pct" ? "%" : metric === "energy_kwh_avoided" ? "kWh" : "kgCO₂e"}
                    tone="banana"
                  />
                );
              })}
              <Card className="col-span-2 lg:col-span-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-widest">MRV ledger — this field</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-72 px-4 pb-4">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-muted-foreground text-left border-b border-border">
                          <th className="py-2 pr-2 font-normal">recorded</th>
                          <th className="py-2 pr-2 font-normal">metric</th>
                          <th className="py-2 pr-2 font-normal text-right">value</th>
                          <th className="py-2 font-normal">method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {impactRecords.map((r) => (
                          <tr key={r.id} className="border-b border-border/50">
                            <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(r.recordedAt)}</td>
                            <td className="py-2 pr-2">{METRIC_LABELS[r.metric] ?? r.metric}</td>
                            <td className="py-2 pr-2 text-right font-bold whitespace-nowrap">
                              {metricValue(r.metric, r.value)}
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function metricValue(metric: string, value: number): string {
  if (metric === "water_liters_saved") return fmtLiters(value);
  if (metric === "yield_protection_pct") return `${value.toFixed(1)}%`;
  if (metric === "energy_kwh_avoided") return `${value.toFixed(1)} kWh`;
  if (metric === "co2_kg_avoided") return `${value.toFixed(1)} kgCO₂e`;
  return `${value}`;
}

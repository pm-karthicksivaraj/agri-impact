"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Radar, CheckCheck } from "lucide-react";
import { api } from "@/lib/client/api";
import { useAlerts } from "@/hooks/useAgriData";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { SEVERITY_CLASSES, fmtDateTime } from "./status";
import type { AlertItem } from "@/lib/client/api";

const TYPE_ICONS: Record<string, string> = {
  "dry-stress": "DROUGHT",
  "heavy-rain": "RAIN",
  heat: "HEAT",
};

export function AlertsView() {
  const { alerts, error } = useAlerts();
  const openField = useAppStore((s) => s.openField);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [acking, setAking] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unack">("unack");

  const runScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const res = await api.scanAll();
      bumpRefresh();
      toast({ title: "Checks complete", description: res.message });
    } catch (e) {
      toast({
        title: "Scan failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const ack = async (a: AlertItem) => {
    if (acking) return;
    setAking(a.id);
    try {
      await api.acknowledgeAlert(a.id);
      bumpRefresh();
    } catch (e) {
      toast({
        title: "Failed to acknowledge",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAking(null);
    }
  };

  const list = (alerts ?? []).filter((a) => (filter === "unack" ? !a.acknowledged : true));
  const unackCount = (alerts ?? []).filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filter === "unack" ? "default" : "outline"}
            onClick={() => setFilter("unack")}
          >
            Active ({unackCount})
          </Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All history ({alerts?.length ?? 0})
          </Button>
        </div>
        <Button size="sm" onClick={runScan} disabled={scanning}>
          <RefreshCw className={`h-4 w-4 mr-1 ${scanning ? "animate-spin" : ""}`} aria-hidden />
          {scanning ? "Checking fields…" : "Run checks on all fields"}
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-[#B3491F]">{error}</p>
          </CardContent>
        </Card>
      ) : !alerts ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Radar className="h-10 w-10 mx-auto text-[#2E7F25] dark:text-[#55B54A]" aria-hidden />
            <h2 className="mt-3 text-sm font-bold uppercase tracking-widest">
              {filter === "unack" ? "All clear" : "No alerts yet"}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              {filter === "unack"
                ? "No unacknowledged alerts. Rules re-evaluate on every analysis run — press “Run checks” to re-scan all fields against the latest forecast."
                : "Alerts appear when the 7-day dry-run forecast crosses a crop stress, heavy-rain or heat rule."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {list.map((a) => (
            <Card key={a.id} className={a.acknowledged ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                          SEVERITY_CLASSES[a.severity] ?? SEVERITY_CLASSES.info
                        }`}
                      >
                        {a.severity}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        {TYPE_ICONS[a.type] ?? a.type}
                      </span>
                      {a.metricValue !== null ? (
                        <span className="text-[9px] text-muted-foreground">· {a.metricValue.toFixed(0)} {a.metricKey?.includes("mm") ? "mm" : a.metricKey?.includes("c") ? "°C" : "%"}</span>
                      ) : null}
                    </div>
                    <h3 className="text-sm font-bold mt-1.5 leading-snug">{a.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{a.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                      <button className="font-bold hover:underline" onClick={() => openField(a.fieldId)}>
                        {a.fieldName}
                      </button>
                      <span>· {a.region} · {fmtDateTime(a.triggeredAt)}</span>
                    </div>
                  </div>
                  {!a.acknowledged ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => void ack(a)}
                      disabled={acking === a.id}
                    >
                      <CheckCheck className="h-4 w-4 mr-1" aria-hidden />
                      {acking === a.id ? "…" : "Ack"}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

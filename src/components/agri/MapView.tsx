"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Crop, MapPin, MousePointer2, Pencil, Trash2, Undo2, Check, Radar } from "lucide-react";
import { api } from "@/lib/client/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { polygonAreaHa, polygonCentroid } from "@/lib/engine/geo";
import { useFields } from "@/hooks/useAgriData";
import { statusFor, TONE_CLASSES, TONE_LABEL, fmtDate } from "./status";
import { FieldForm } from "./FieldForm";
import type { LatLngTuple } from "./MapCanvas";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

export function MapView() {
  const { fields, error } = useFields();
  const openField = useAppStore((s) => s.openField);
  const selectedFieldId = useAppStore((s) => s.selectedFieldId);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const { toast } = useToast();

  const [drawing, setDrawing] = useState(false);
  const [vertices, setVertices] = useState<LatLngTuple[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const draftArea = useMemo(() => (vertices.length >= 3 ? polygonAreaHa(vertices) : 0), [vertices]);
  const draftCentroid = useMemo(() => polygonCentroid(vertices), [vertices]);

  const startDrawing = () => {
    setDrawing(true);
    setVertices([]);
  };
  const cancelDrawing = () => {
    setDrawing(false);
    setVertices([]);
  };
  const completePolygon = () => {
    if (vertices.length >= 3) {
      setDrawing(false);
      setFormOpen(true);
    }
  };

  const handleFieldDelete = async (id: string, name: string) => {
    if (deleting) return;
    setDeleting(id);
    try {
      await api.deleteField(id);
      bumpRefresh();
      toast({ title: "Field deleted", description: `${name} and its records were removed.` });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Field registry */}
      <div className="w-full lg:w-80 shrink-0 order-2 lg:order-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
              <Crop className="h-4 w-4 text-[#2E7F25]" aria-hidden /> Field registry
            </CardTitle>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {fields
                ? `${fields.length} field(s) · ${fields.reduce((s, f) => s + f.areaHa, 0).toFixed(1)} ha monitored`
                : "loading…"}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pb-3">
              <Button
                onClick={drawing ? cancelDrawing : startDrawing}
                variant={drawing ? "destructive" : "default"}
                className="w-full"
                size="sm"
              >
                {drawing ? (
                  <>
                    <Undo2 className="h-4 w-4 mr-1" aria-hidden /> Cancel drawing
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-1" aria-hidden /> Draw new field
                  </>
                )}
              </Button>
            </div>
            <ScrollArea className="h-[280px] lg:h-[420px] px-4 pb-4">
              <div className="flex flex-col gap-2">
                {error ? (
                  <p className="text-xs text-[#B3491F]">{error}</p>
                ) : !fields ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : fields.length === 0 ? (
                  <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-4 leading-relaxed">
                    No fields yet. Click <span className="font-bold">Draw new field</span> and click the map to place
                    at least 3 corners — or load the demo dataset from the header.
                  </div>
                ) : (
                  fields.map((f) => {
                    const tone = statusFor(f.currentRootzone, f.raw);
                    const selected = f.id === selectedFieldId;
                    return (
                      <div
                        key={f.id}
                        className={`rounded-md border p-3 cursor-pointer transition-colors ${
                          selected ? "border-[#2E7F25] bg-[#E9F5E6] dark:bg-[#16220F]" : "border-border hover:bg-muted"
                        }`}
                        onClick={() => openField(f.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") openField(f.id);
                        }}
                        aria-label={`Open ${f.name} dashboard`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{f.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {f.region} · {f.cropLabel}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {f.areaHa} ha · {f.soilLabel} · updated {f.latestRunAt ? fmtDate(f.latestRunAt) : "—"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${TONE_CLASSES[tone]}`}>
                              {TONE_LABEL[tone]}
                            </span>
                            {f.alertCount > 0 ? (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-[#EEC4AE] text-[#B3491F] dark:text-[#E0703F]">
                                {f.alertCount} alert{f.alertCount > 1 ? "s" : ""}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              openField(f.id);
                            }}
                          >
                            <Radar className="h-3 w-3 mr-1" aria-hidden /> Open
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] text-[#B3491F] hover:text-[#B3491F] dark:text-[#E0703F]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3 mr-1" aria-hidden /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-sm">Delete “{f.name}”?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs leading-relaxed">
                                  This removes the field, its snapshots, advisories, alerts and impact ledger
                                  entries. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Keep</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={deleting === f.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleFieldDelete(f.id, f.name);
                                  }}
                                >
                                  {deleting === f.id ? "Deleting…" : "Delete field"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <div className="flex-1 order-1 lg:order-2 min-w-0">
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <div className="h-[340px] sm:h-[420px] lg:h-[560px] relative">
              <MapCanvas
                fields={fields ?? []}
                selectedFieldId={selectedFieldId}
                drawing={drawing}
                vertices={vertices}
                onVertexAdd={(p) => setVertices((vs) => [...vs, p])}
                onComplete={completePolygon}
                onFieldSelect={openField}
              />
              {/* draw toolbar overlay — top-right so it never covers Leaflet's zoom control (top-left) */}
              <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2 pointer-events-auto items-end">
                {drawing ? (
                  <div className="bg-card border border-border rounded-md px-3 py-2 shadow-sm text-[10px] leading-relaxed max-w-[240px] tick-in">
                    <p className="font-bold uppercase tracking-wider flex items-center gap-1">
                      <MousePointer2 className="h-3 w-3" aria-hidden /> Drawing mode
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Click the map to add corners ({vertices.length} placed). Click the{" "}
                      <span className="text-[#B3491F] font-bold">first corner again</span> to close the polygon.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-[10px]"
                        onClick={() => setVertices((vs) => vs.slice(0, -1))}
                        disabled={vertices.length === 0}
                      >
                        <Undo2 className="h-3 w-3 mr-1" aria-hidden /> Undo
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-[10px]"
                        onClick={completePolygon}
                        disabled={vertices.length < 3}
                      >
                        <Check className="h-3 w-3 mr-1" aria-hidden /> Finish
                      </Button>
                    </div>
                    {draftArea > 0 ? (
                      <p className="mt-1 text-[#2E7F25] dark:text-[#55B54A] font-bold">{draftArea.toFixed(2)} ha</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="bg-card/90 backdrop-blur border border-border rounded-md px-3 py-1.5 shadow-sm text-[10px]">
                    <span className="text-muted-foreground">
                      {fields && fields.length > 0
                        ? "Click a field polygon to open its dashboard"
                        : "Draw your first field to begin"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <FieldForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          // closing without saving clears the drawn polygon too (no stale preview)
          if (!v) setVertices([]);
        }}
        vertices={vertices}
        areaHa={draftArea}
        centroid={draftCentroid}
        onDone={() => setVertices([])}
      />
    </div>
  );
}

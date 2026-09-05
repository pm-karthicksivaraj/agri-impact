"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CROPS, SOILS, STAGE_LABELS } from "@/lib/engine/crops";
import { api } from "@/lib/client/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type { LatLngTuple } from "./MapCanvas";

export function FieldForm({
  open,
  onOpenChange,
  vertices,
  areaHa,
  centroid,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vertices: LatLngTuple[];
  areaHa: number;
  centroid: LatLngTuple;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [cropType, setCropType] = useState("rice");
  const [soilType, setSoilType] = useState("clay");
  const [growthStage, setGrowthStage] = useState("mid");
  const [region, setRegion] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerRole, setOwnerRole] = useState("farmer");
  const [irrigationMethod, setIrrigationMethod] = useState("pump");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const openField = useAppStore((s) => s.openField);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.createField({
        name: name.trim(),
        cropType,
        soilType,
        growthStage,
        region: region.trim() || "My region",
        ownerName: ownerName.trim() || "Me",
        ownerRole,
        irrigationMethod,
        polygon: vertices,
      });
      bumpRefresh();
      if (res.warning) {
        toast({
          title: "Field saved — analysis warning",
          description: res.warning,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Field created & analysed",
          description: `${res.field.name}: root-zone ${Math.round(res.field.currentRootzone ?? 0)}% AWC — forecast, advisories and alerts are ready.`,
        });
      }
      openField(res.field.id);
      onOpenChange(false);
      setName("");
      setRegion("");
      setOwnerName("");
      onDone();
    } catch (e) {
      toast({
        title: "Could not save field",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider text-base">Register new field</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {vertices.length} vertices · {areaHa.toFixed(2)} ha · centroid {centroid[0].toFixed(4)},{" "}
            {centroid[1].toFixed(4)}. The analysis runs on live weather for this exact location.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="field-name">Field name</Label>
              <Input
                id="field-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Paddy An Binh"
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="field-region">Region / province</Label>
              <Input
                id="field-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Can Tho"
                maxLength={60}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="field-crop">Crop</Label>
              <Select value={cropType} onValueChange={setCropType}>
                <SelectTrigger id="field-crop">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CROPS).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="field-soil">Soil type</Label>
              <Select value={soilType} onValueChange={setSoilType}>
                <SelectTrigger id="field-soil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(SOILS).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="field-stage">Growth stage</Label>
              <Select value={growthStage} onValueChange={setGrowthStage}>
                <SelectTrigger id="field-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STAGE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="field-irrigation">Irrigation method</Label>
              <Select value={irrigationMethod} onValueChange={setIrrigationMethod}>
                <SelectTrigger id="field-irrigation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pump">Pumped</SelectItem>
                  <SelectItem value="gravity">Gravity-fed</SelectItem>
                  <SelectItem value="canal">Canal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="field-owner">Owner / steward</Label>
              <Input
                id="field-owner"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Tran Van Minh"
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="field-role">Stakeholder role</Label>
              <Select value={ownerRole} onValueChange={setOwnerRole}>
                <SelectTrigger id="field-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="farmer">Farmer</SelectItem>
                  <SelectItem value="cooperative">Cooperative</SelectItem>
                  <SelectItem value="extension">Extension officer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || name.trim().length < 2}>
            {submitting ? "Saving & analysing…" : "Save & run analysis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { FieldListItem } from "@/lib/client/api";
import { statusFor } from "./status";

export type LatLngTuple = [number, number];

function MapEvents({
  drawing,
  vertices,
  onVertexAdd,
  onComplete,
}: {
  drawing: boolean;
  vertices: LatLngTuple[];
  onVertexAdd: (p: LatLngTuple) => void;
  onComplete: () => void;
}) {
  useMapEvents({
    click(e) {
      if (!drawing) return;
      const pt: LatLngTuple = [e.latlng.lat, e.latlng.lng];
      if (vertices.length >= 3) {
        const map = (e.target as unknown as { latLngToContainerPoint: (l: { lat: number; lng: number }) => { x: number; y: number } }) ?? null;
        if (map?.latLngToContainerPoint) {
          const p1 = map.latLngToContainerPoint({ lat: vertices[0][0], lng: vertices[0][1] });
          const p2 = map.latLngToContainerPoint({ lat: pt[0], lng: pt[1] });
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 22) {
            onComplete();
            return;
          }
        }
      }
      onVertexAdd(pt);
    },
  });
  return null;
}

function FitFields({ fields, selectedId }: { fields: FieldListItem[]; selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedId) {
      const f = fields.find((x) => x.id === selectedId);
      if (f?.polygon?.length) {
        const lats = f.polygon.map((p) => p[0]);
        const lngs = f.polygon.map((p) => p[1]);
        map.fitBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { padding: [60, 60], maxZoom: 17 }
        );
      }
      return;
    }
    if (fields.length > 0) {
      const all = fields.flatMap((f) => f.polygon ?? []);
      if (all.length >= 3) {
        const lats = all.map((p) => p[0]);
        const lngs = all.map((p) => p[1]);
        map.fitBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { padding: [40, 40] }
        );
      }
    }
  }, [selectedId]);
  return null;
}

const TONE_FILL: Record<string, { color: string; fillOpacity: number }> = {
  good: { color: "#2E7F25", fillOpacity: 0.22 },
  near: { color: "#C9971E", fillOpacity: 0.25 },
  stressed: { color: "#B3491F", fillOpacity: 0.28 },
  unknown: { color: "#8B9683", fillOpacity: 0.2 },
};

export default function MapCanvas({
  fields,
  selectedFieldId,
  drawing,
  vertices,
  onVertexAdd,
  onComplete,
  onFieldSelect,
}: {
  fields: FieldListItem[];
  selectedFieldId: string | null;
  drawing: boolean;
  vertices: LatLngTuple[];
  onVertexAdd: (p: LatLngTuple) => void;
  onComplete: () => void;
  onFieldSelect: (id: string) => void;
}) {
  // keyless tile provider: German OSM mirror (real OSM data, global coverage).
  // Dark mode is handled by a CSS filter on the tile images (see globals.css).
  const tileUrl = "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png";

  const center = useMemo<LatLngTuple>(() => [14.6, 107.5], []);

  return (
    <MapContainer
      center={center}
      zoom={6}
      className={`h-full w-full ${drawing ? "crosshair-cursor" : ""}`}
      scrollWheelZoom
    >
      <TileLayer
        key="osmde"
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · tiles: openstreetmap.de'
        subdomains="abc"
        maxZoom={19}
      />
      <MapEvents drawing={drawing} vertices={vertices} onVertexAdd={onVertexAdd} onComplete={onComplete} />
      <FitFields fields={fields} selectedId={selectedFieldId} />

      {fields.map((f) => {
        const tone = statusFor(f.currentRootzone, f.raw);
        const t = TONE_FILL[tone];
        const selected = f.id === selectedFieldId;
        return (
          <Polygon
            key={f.id}
            positions={f.polygon as [number, number][]}
            pathOptions={{
              color: t.color,
              weight: selected ? 3.5 : 2,
              fillColor: t.color,
              fillOpacity: t.fillOpacity,
              dashArray: selected ? undefined : undefined,
            }}
            eventHandlers={{ click: () => onFieldSelect(f.id) }}
          >
            <Tooltip sticky>
              <span className="font-bold">{f.name}</span>
              <br />
              {f.cropLabel} · {f.areaHa} ha
              <br />
              root-zone {f.currentRootzone !== null ? `${Math.round(f.currentRootzone)}% AWC` : "no data"}
            </Tooltip>
          </Polygon>
        );
      })}

      {vertices.length > 0 ? (
        <Polyline
          positions={[...vertices, vertices[0]]}
          pathOptions={{ color: "#2E7F25", weight: 2.5, dashArray: "6 6" }}
        />
      ) : null}
      {vertices.map((v, i) => (
        <CircleMarker
          key={`v-${i}-${v[0]},${v[1]}`}
          center={v}
          radius={5}
          pathOptions={{
            color: i === 0 && vertices.length >= 3 ? "#B3491F" : "#17220F",
            fillColor: "#2E7F25",
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ))}
    </MapContainer>
  );
}

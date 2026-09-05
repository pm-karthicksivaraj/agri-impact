// Geodesic helpers for field polygons (no external GIS deps)

import type { Polygon, LatLng } from "./types";

const EARTH_RADIUS_M = 6371008.8;

/**
 * Geodesic area of a polygon on a sphere (spherical excess, same approach as
 * Turf.js ringArea). Input: [[lat, lng], ...] ring (open or closed).
 * Returns area in square meters.
 */
export function polygonAreaM2(ring: LatLng[]): number {
  if (ring.length < 3) return 0;
  const pts = ring.slice();
  // close ring if needed
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) pts.push([first[0], first[1]]);

  const n = pts.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    total += (rad(p2[1]) - rad(p1[1])) * (2 + Math.sin(rad(p1[0])) + Math.sin(rad(p2[0])));
  }
  const area = (total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2;
  return Math.abs(area);
}

export function polygonAreaHa(ring: LatLng[]): number {
  return polygonAreaM2(ring) / 10000;
}

/** Planar centroid (equirectangular-corrected) — accurate enough for field scale. */
export function polygonCentroid(ring: LatLng[]): LatLng {
  if (ring.length === 0) return [0, 0];
  if (ring.length === 1) return ring[0];
  const latRef = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cosLat = Math.cos(rad(latRef));
  let cx = 0;
  let cy = 0;
  let a = 0; // shoelace area in corrected coords
  const pts = ring.slice();
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) pts.push([first[0], first[1]]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [lat1, lng1] = pts[i];
    const [lat2, lng2] = pts[i + 1];
    const x1 = lng1 * cosLat;
    const y1 = lat1;
    const x2 = lng2 * cosLat;
    const y2 = lat2;
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-12) {
    // degenerate: fall back to mean
    return [
      ring.reduce((s, p) => s + p[0], 0) / ring.length,
      ring.reduce((s, p) => s + p[1], 0) / ring.length,
    ];
  }
  a *= 3;
  return [cy / a, (cx / a) / cosLat];
}

/** Validate + normalise a polygon received from the client. */
export function normalizePolygon(input: unknown): Polygon {
  if (!Array.isArray(input) || input.length < 3) {
    throw new Error("Polygon must be an array of at least 3 [lat, lng] points");
  }
  if (input.length > 64) {
    throw new Error("Polygon has too many vertices (max 64)");
  }
  const pts: LatLng[] = [];
  for (const raw of input) {
    if (!Array.isArray(raw) || raw.length !== 2) {
      throw new Error("Each polygon point must be [lat, lng]");
    }
    const lat = Number(raw[0]);
    const lng = Number(raw[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Polygon coordinates must be finite numbers");
    }
    if (lat < -85 || lat > 85 || lng < -180 || lng > 180) {
      throw new Error("Polygon coordinates out of range");
    }
    pts.push([lat, lng]);
  }
  return pts;
}

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

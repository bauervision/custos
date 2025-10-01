"use client";
import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  GeoJSON,
  useMap,
} from "react-leaflet";
import type { VendorAgg } from "@/components/loading/VendorCard";
import { useSelection } from "@/state/selection";
import { patchLeafletIcons } from "@/lib/leaflet";
import L from "leaflet";
import { DARK_TILE } from "@/lib/tiles";

type Props = {
  vendors: VendorAgg[];
  aoi?: {
    bounds?: { south: number; west: number; north: number; east: number };
    geojson?: any;
  } | null;
};

const COUNTRY_CENTER: Record<string, [number, number]> = {
  "South Africa": [-28.48, 24.67],
  Namibia: [-22.56, 17.08],
  Botswana: [-22.33, 24.68],
  Germany: [51.16, 10.45],
  Singapore: [1.35, 103.82],
  Norway: [60.47, 8.47],
  Canada: [56.13, -106.35],
  China: [35.86, 104.19],
  UAE: [23.42, 53.85],
};

// --- AOI helpers (rect + polygon GeoJSON) ---
type BBox = { south: number; west: number; north: number; east: number };
type Ring = [number, number][]; // [lng, lat][]

function toRing(coords: any): Ring {
  if (!Array.isArray(coords)) return [];
  return coords
    .map((p: any) =>
      Array.isArray(p) && p.length >= 2
        ? ([Number(p[0]), Number(p[1])] as [number, number])
        : null
    )
    .filter(Boolean) as Ring;
}

function normLon(lon: number): number {
  let x: number = Number(lon);
  while (x <= -180) x += 360;
  while (x > 180) x -= 360;
  return x;
}

function inBbox(lat: number, lon: number, b: BBox): boolean {
  // normalize longitude into [-180, 180]
  let LON = lon;
  while (LON <= -180) LON += 360;
  while (LON > 180) LON -= 360;

  const W = (() => {
    let v = b.west;
    while (v <= -180) v += 360;
    while (v > 180) v -= 360;
    return v;
  })();

  const E = (() => {
    let v = b.east;
    while (v <= -180) v += 360;
    while (v > 180) v -= 360;
    return v;
  })();

  // longitude test — if bbox crosses the dateline, accept either side
  const withinLon = W <= E ? LON >= W && LON <= E : LON >= W || LON <= E;

  // latitude test
  const withinLat = lat >= b.south && lat <= b.north;

  return withinLat && withinLon;
}

function pointInRing(lat: number, lon: number, ring: Ring) {
  const x = normLon(lon);
  const y = lat;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];

    const xi = normLon(lngI);
    const yi = latI;
    const xj = normLon(lngJ);
    const yj = latJ;

    // only consider edges that straddle the horizontal ray at y
    const straddles = yi > y !== yj > y;
    if (!straddles) continue;

    // compute x coordinate of intersection; guard small denom
    const denom = yj - yi || 1e-12;
    const xIntersect = ((xj - xi) * (y - yi)) / denom + xi;

    if (x < xIntersect) inside = !inside;
  }

  return inside;
}

function inGeoJSON(lat: number, lon: number, gj: any) {
  const g = gj?.geometry ?? gj;
  if (!g) return false;
  if (g.type === "Polygon") {
    const outer: Ring = toRing(g.coordinates?.[0]);
    return outer.length ? pointInRing(lat, lon, outer) : false;
  }
  if (g.type === "MultiPolygon") {
    const polys: any[] = g.coordinates ?? [];
    for (const poly of polys) {
      const outer: Ring = toRing(poly?.[0]);
      if (outer.length && pointInRing(lat, lon, outer)) return true;
    }
    return false;
  }
  return false;
}

function isInsideAoi(lat: number, lon: number, aoi?: Props["aoi"]) {
  if (!aoi) return true; // no AOI → allow all
  if (aoi.geojson && inGeoJSON(lat, lon, aoi.geojson)) return true;
  if (aoi.bounds && inBbox(lat, lon, aoi.bounds)) return true;
  return false;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}
function jitter([lat, lon]: [number, number], seed: string): [number, number] {
  const a = (hash(seed) % 100) / 100 - 0.5;
  const b = (hash(seed + "x") % 100) / 100 - 0.5;
  return [lat + a * 0.4, lon + b * 0.4];
}

function FitAll({
  points,
  aoi,
}: {
  points: [number, number][];
  aoi?: Props["aoi"];
}) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      points.map(([lat, lng]) => L.latLng(lat, lng))
    );

    // If no points but AOI exists, fit to AOI instead (nice UX)
    if ((!points.length || !bounds.isValid()) && aoi?.bounds) {
      const sw = L.latLng(aoi.bounds.south, aoi.bounds.west);
      const ne = L.latLng(aoi.bounds.north, aoi.bounds.east);
      const aoiBounds = L.latLngBounds(sw, ne);
      if (aoiBounds.isValid()) {
        map.fitBounds(aoiBounds, { padding: [40, 40] });
        return;
      }
    }

    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, aoi, map]);
  return null;
}

export default function ResultsMap({ vendors, aoi }: Props) {
  const { hoverVendor, selectedVendor } = useSelection();
  useEffect(() => {
    patchLeafletIcons();
  }, []);

  const positions = useMemo(() => {
    const raw = vendors.map((v) => {
      const base = COUNTRY_CENTER[v.country] || [0, 0];
      const pos = jitter(base as [number, number], v.name);
      return { name: v.name, pos };
    });

    // Only keep pins inside the AOI (polygon or rectangle)
    return raw.filter(({ pos: [lat, lon] }) => isInsideAoi(lat, lon, aoi));
  }, [vendors, aoi]);

  const pts = positions.map((p) => p.pos as [number, number]);

  return (
    <MapContainer
      className="h-full w-full rounded-xl overflow-hidden border border-white/10"
      center={[15, 10]}
      zoom={2}
      worldCopyJump
    >
      <TileLayer url={DARK_TILE.url} attribution={DARK_TILE.attribution} />
      <FitAll points={pts} aoi={aoi} />

      {/* AOI overlay if present */}
      {aoi?.geojson && (
        <GeoJSON
          data={aoi.geojson}
          style={{
            color: "rgba(0,255,200,0.9)",
            weight: 2,
            fillColor: "rgba(0,255,200,0.2)",
            fillOpacity: 0.25,
          }}
        />
      )}

      {/* Vendor pins */}
      {positions.map(({ name, pos }) => {
        const isHover = name === hoverVendor || name === selectedVendor;
        return (
          <CircleMarker
            key={name}
            center={pos}
            radius={isHover ? 10 : 7}
            pathOptions={{
              color: isHover ? "rgba(0,255,200,0.9)" : "rgba(180,220,255,0.7)",
              fillColor: isHover
                ? "rgba(0,255,200,0.6)"
                : "rgba(180,220,255,0.35)",
              weight: isHover ? 3 : 2,
              fillOpacity: 0.9,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.9}>
              {name}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

"use client";
import { useEffect, useMemo, useRef } from "react";
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
import { withAlpha, accentForRisk } from "@/lib/palette";
import { riskFromBreakdown } from "@/lib/scoring";
import { useSearchParams } from "next/navigation";

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
  let LON = lon;
  while (LON <= -180) LON += 360;
  while (LON > 180) LON -= 360;

  const wrap = (v: number) => {
    let x = v;
    while (x <= -180) x += 360;
    while (x > 180) x -= 360;
    return x;
  };
  const W = wrap(b.west);
  const E = wrap(b.east);

  const withinLon = W <= E ? LON >= W && LON <= E : LON >= W || LON <= E;
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

    const straddles = yi > y !== yj > y;
    if (!straddles) continue;

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

// jitter vendor markers so they don't overlap
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

/** One-time initial fit, driven by URL param (or AOI). */
function FitOnMount({
  points,
  aoi,
  mode,
}: {
  points: [number, number][];
  aoi?: Props["aoi"];
  mode: "world" | "aoi" | "vendors";
}) {
  const map = useMap();
  const hasInteractedRef = useRef(false);

  useEffect(() => {
    const onMoveStart = () => {
      hasInteractedRef.current = true;
    };
    map.on("movestart", onMoveStart);
    return () => {
      map.off("movestart", onMoveStart);
    };
  }, [map]);

  useEffect(() => {
    if (hasInteractedRef.current) return;

    const fitWorld = () => {
      try {
        (map as any).fitWorld({ animate: false, padding: [20, 20] });
      } catch {
        map.setView([20, 0], 2, { animate: false });
      }
    };

    if (mode === "world") {
      fitWorld();
      return;
    }

    if (mode === "vendors") {
      if (points.length) {
        const bounds = L.latLngBounds(points.map(([y, x]) => L.latLng(y, x)));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40] });
          return;
        }
      }
      const b = aoi?.bounds;
      if (b) {
        const bounds = L.latLngBounds(
          L.latLng(b.south, b.west),
          L.latLng(b.north, b.east)
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40] });
          return;
        }
      }
      fitWorld();
      return;
    }

    if (mode === "aoi") {
      const b = aoi?.bounds;
      if (b) {
        const bounds = L.latLngBounds(
          L.latLng(b.south, b.west),
          L.latLng(b.north, b.east)
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40] });
          return;
        }
      }
      fitWorld();
      return;
    }

    // mode === "vendors": only then fit to vendor points
    if (points.length) {
      const bounds = L.latLngBounds(points.map(([y, x]) => L.latLng(y, x)));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
        return;
      }
    }
    fitWorld();
  }, [map]); // run once on mount

  return null;
}

export default function ResultsMap({ vendors, aoi }: Props) {
  const { hoverVendor, selectedVendor } = useSelection();
  const params = useSearchParams();

  useEffect(() => {
    patchLeafletIcons();
  }, []);

  const positions = useMemo(() => {
    const raw = vendors.map((v) => {
      const base = COUNTRY_CENTER[v.country] || [0, 0];
      const pos = jitter(base as [number, number], v.name);
      return { name: v.name, pos };
    });
    // keep only pins inside AOI
    return raw.filter(({ pos: [lat, lon] }) => isInsideAoi(lat, lon, aoi));
  }, [vendors, aoi]);

  const pts = positions.map((p) => p.pos as [number, number]);

  // Determine initial mode: URL > AOI > world
  const zoomParam = (params.get("zoom") || "").toLowerCase();
  const initialMode: "world" | "aoi" | "vendors" =
    zoomParam === "world"
      ? "world"
      : zoomParam === "aoi"
      ? "aoi"
      : zoomParam === "vendors"
      ? "vendors"
      : aoi?.bounds
      ? "aoi"
      : "vendors";

  return (
    <MapContainer
      className="h-full w-full rounded-xl overflow-hidden border border-white/10"
      // Neutral defaults; world-ish, not SA
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      worldCopyJump
      preferCanvas
    >
      <TileLayer url={DARK_TILE.url} attribution={DARK_TILE.attribution} />

      {/* Only run once, honor ?zoom explicitly */}
      <FitOnMount
        points={pts}
        aoi={aoi}
        mode={initialMode} // "world" | "aoi" | "vendors"
      />

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

      {positions.map(({ name, pos }) => {
        const isHover = name === hoverVendor || name === selectedVendor;
        const vendor = vendors.find((v) => v.name === name);
        const risk = vendor ? riskFromBreakdown(vendor.breakdown) : 50;
        const accent = accentForRisk(risk);

        return (
          <CircleMarker
            key={name}
            center={pos}
            radius={isHover ? 10 : 7}
            pathOptions={{
              color: withAlpha(accent, isHover ? 0.95 : 0.75),
              fillColor: withAlpha(accent, isHover ? 0.6 : 0.35),
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

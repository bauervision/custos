"use client";
import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { VendorAgg } from "@/components/loading/VendorCard";
import { useSelection } from "@/state/selection";
import { patchLeafletIcons } from "@/lib/leaflet";

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

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = points as any;
    // @ts-ignore
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

export default function ResultsMap({ vendors }: { vendors: VendorAgg[] }) {
  const { hoverVendor, selectedVendor } = useSelection();
  useEffect(() => {
    patchLeafletIcons();
  }, []);

  const positions = useMemo(() => {
    return vendors.map((v) => {
      const base = COUNTRY_CENTER[v.country] || [0, 0];
      const pos = jitter(base as [number, number], v.name);
      return { name: v.name, pos };
    });
  }, [vendors]);

  const pts = positions.map((p) => p.pos as [number, number]);

  return (
    <MapContainer
      className="h-full w-full rounded-xl overflow-hidden border border-white/10"
      center={[15, 10]}
      zoom={2}
      worldCopyJump
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      <FitBounds points={pts} />
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

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { loadLatestRun } from "@/lib/results";
import VendorCard, { type VendorAgg } from "@/components/loading/VendorCard";
import { recommendationScore, riskFromBreakdown } from "@/lib/scoring";
import VendorReportDialog from "@/components/results/VendorReportDialog";
import { useSelection } from "@/state/selection";

// Map must be client-only to avoid "window is not defined"
const ResultsMap = dynamic(() => import("@/components/results/ResultsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full rounded-xl border border-white/10 bg-white/[0.02] grid place-items-center text-sm text-white/60">
      Loading map…
    </div>
  ),
});

type BBox = { south: number; west: number; north: number; east: number };

function normLon(lon: number): number {
  let x = lon;
  while (x <= -180) x += 360;
  while (x > 180) x -= 360;
  return x;
}
function inBbox(lat: number, lon: number, b: BBox): boolean {
  const LON = normLon(lon),
    W = normLon(b.west),
    E = normLon(b.east);
  const withinLon = W <= E ? LON >= W && LON <= E : LON >= W || LON <= E;
  return lat >= b.south && lat <= b.north && withinLon;
}

// keep in sync with ResultsMap
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

export default function ResultsPage() {
  const [vendors, setVendors] = useState<VendorAgg[]>([]);
  const data = useMemo(() => loadLatestRun(), []);
  const { setHoverVendor, setSelectedVendor } = useSelection();

  useEffect(() => {
    if (data?.vendors?.length) setVendors(data.vendors);
  }, [data]);

  const sorted = useMemo(() => {
    return [...vendors].sort((a, b) => {
      const ar = recommendationScore(riskFromBreakdown(a.breakdown));
      const br = recommendationScore(riskFromBreakdown(b.breakdown));
      return br - ar;
    });
  }, [vendors]);

  const aoi = data?.aoi;

  const visible = useMemo(() => {
    if (!aoi?.bounds) return sorted;
    return sorted.filter((v) => {
      const center = COUNTRY_CENTER[v.country];
      if (!center) return false;
      const [lat, lon] = center;
      return inBbox(lat, lon, aoi.bounds);
    });
  }, [sorted, aoi]);

  if (!sorted.length) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold mb-3">Results</h1>
        <p className="text-white/70">
          No recent run found. Try{" "}
          <a className="underline" href="/loading">
            running a report
          </a>{" "}
          first.
        </p>
      </div>
    );
  }

  // Full-height split: adjust calc() if your header/footer change
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Vendor Landscape</h1>

      {aoi && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">
          AOI active • centered at{" "}
          {aoi?.center
            ? `${aoi.center.lat.toFixed(2)}, ${aoi.center.lon.toFixed(2)}`
            : "—"}
        </div>
      )}

      <div className="grid grid-cols-[380px_1fr] gap-6 h-[calc(100vh-160px)]">
        {/* Left: list (independent scroll) */}
        <div className="rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-4 py-3 text-sm text-white/70 border-b border-white/10">
            Vendors (hover to highlight on map)
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="grid gap-4">
              {visible.map((v) => (
                <div
                  key={v.name}
                  onMouseEnter={() => setHoverVendor(v.name)}
                  onMouseLeave={() => setHoverVendor(undefined)}
                  onFocus={() => setHoverVendor(v.name)}
                  onBlur={() => setHoverVendor(undefined)}
                  onClick={() => setSelectedVendor(v.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelectedVendor(v.name);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <VendorCard v={v} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: map fills remaining space */}
        <div className="h-full">
          <ResultsMap vendors={sorted} aoi={aoi} />
        </div>
      </div>

      <VendorReportDialog vendors={sorted} />
    </div>
  );
}

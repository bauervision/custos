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

      <div className="grid grid-cols-[380px_1fr] gap-6 h-[calc(100vh-160px)]">
        {/* Left: list (independent scroll) */}
        <div className="rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-4 py-3 text-sm text-white/70 border-b border-white/10">
            Vendors (hover to highlight on map)
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="grid gap-4">
              {sorted.map((v) => (
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
          <ResultsMap vendors={sorted} />
        </div>
      </div>

      <VendorReportDialog vendors={sorted} />
    </div>
  );
}

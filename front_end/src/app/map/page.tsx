"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { patchLeafletIcons } from "@/lib/leaflet";
import { useKustos } from "@/lib/provider";

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
});

export default function MapPage() {
  const { discoveryVendors, prescreen, startVetting } = useKustos();

  useEffect(() => {
    patchLeafletIcons();
  }, []);

  // quick prescreen summary chip (optional)
  const prescreenSummary = useMemo(() => {
    const inc = (prescreen.include || []).filter(Boolean);
    const exc = (prescreen.exclude || []).filter(Boolean);
    const bits = [];
    if (inc.length) bits.push(`Include: ${inc.join(", ")}`);
    if (exc.length) bits.push(`Exclude: ${exc.join(", ")}`);
    return bits.join(" • ");
  }, [prescreen]);

  const proceed = () => {
    // seed can be customized — this is just a readable marker
    const names = discoveryVendors.map((v) => v.name).join(", ");
    const seed = `Discovery → Vetting: ${names}`;
    startVetting(seed, null); // goes to /loading as you already wired
  };

  return (
    <div className="min-h-[calc(100vh-120px)] mx-auto max-w-6xl px-4 py-6 space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Discovery</h1>
          <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs text-white/70">
            {discoveryVendors.length} candidate
            {discoveryVendors.length === 1 ? "" : "s"}
          </span>
          {prescreenSummary && (
            <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">
              {prescreenSummary}
            </span>
          )}
        </div>

        <button
          onClick={proceed}
          className="cta-primary disabled:opacity-50"
          disabled={!discoveryVendors.length}
        >
          Proceed with Vetting
        </button>
      </div>

      {/* Map + AOI panel lives inside MapClient; we keep this page thin */}
      <MapClient />
    </div>
  );
}

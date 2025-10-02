"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RadialHeatmap from "@/components/loading/RadialHeatmap";
import WordCloud from "@/components/loading/WordCloud";
import VendorCard, { type VendorAgg } from "@/components/loading/VendorCard";
import type { Vendor } from "@/core/types";
import { makeVendorId } from "@/core/ids";
import { getProvider } from "@/core/di";
import type { StreamEvent, Aoi } from "@/core/types";
import {
  scoreKeywords,
  recommendationScore,
  riskFromBreakdown,
} from "@/core/scoring";
import { BBox, readAoiFromSession } from "@/lib/aoi";

const TOTAL_MS = 60_000;

// Keep map centers identical to your results page
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

/** ───────────────────────────────────────────────────────────
 * TEMP: tier baseline here so loading + results can align.
 * When ready, move this map to `src/data/companyTiers.ts`
 * and import it from both loading/results and the mock stream.
 * ───────────────────────────────────────────────────────────*/
type Tier = "LOW" | "MEDIUM" | "HIGH";
const COMPANY_TIER: Record<string, Tier> = {
  "Aurora Mineral AG": "LOW",
  "NorthCape Commodities": "LOW",
  "Unique Trade Corp.": "LOW",

  "Platina Global": "MEDIUM",
  "Meridian Metals": "MEDIUM",
  "Pacific Crown Trading": "MEDIUM",

  "EarthMaterials Inc.": "HIGH",
  "Kalahari Extractives": "HIGH",
  "Sable Ridge Holdings": "HIGH",
  "Trans-Continental Logistics": "HIGH",
};

// One-time baseline bump by tier (ensures visible color split)
function baselineDeltaForTier(name: string) {
  const t = COMPANY_TIER[name];
  if (t === "HIGH") return { finance: 25, ethics: 55, logistics: 12 };
  if (t === "MEDIUM") return { finance: 12, ethics: 28, logistics: 6 };
  return { finance: 0, ethics: 0, logistics: 0 };
}

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

export default function LoadingPage() {
  const [elapsed, setElapsed] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const vendorMapRef = useRef<Map<string, VendorAgg>>(new Map());
  const [tick, setTick] = useState(0); // force re-render when vendor map updates
  const providerRef = useRef(getProvider());
  const savedRef = useRef(false);

  // Optional: bias the stream from the query string
  const seed = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("seed") ?? "";
  }, []);

  // AOI for this page (used when saving the run)
  const aoi = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("kustos:aoi");
      return raw ? (JSON.parse(raw) as { bounds?: BBox } & Aoi) : null;
    } catch {
      return null;
    }
  }, []);

  // Progress timer + stream hook-up
  useEffect(() => {
    // progress timer
    const t0 = Date.now();
    const id = setInterval(() => {
      const e = Date.now() - t0;
      setElapsed(Math.min(e, TOTAL_MS));
      if (e >= TOTAL_MS) clearInterval(id);
    }, 200);

    // streaming via provider
    const stop = providerRef.current.streamSignals({
      totalMs: TOTAL_MS,
      intervalMs: 2000,
      seed,
      onEvent(evt: StreamEvent) {
        // global keyword counts (for heatmap + word cloud)
        setCounts((prev) => {
          const next = { ...prev };
          for (const k of evt.keywords) next[k] = (next[k] ?? 0) + 1;
          return next;
        });

        // aggregate vendor data + breakdown (score keywords)
        const key = makeVendorId(evt.name, evt.country);
        const map = vendorMapRef.current;
        const prev = map.get(key);
        const delta = scoreKeywords(evt.keywords);

        if (!prev) {
          // one-time tier baseline
          const base = baselineDeltaForTier(evt.name);
          map.set(key, {
            name: evt.name,
            country: evt.country,
            keywords: Array.from(new Set(evt.keywords)),
            breakdown: {
              finance: delta.finance + base.finance,
              ethics: delta.ethics + base.ethics,
              logistics: delta.logistics + base.logistics,
            },
          });
        } else {
          map.set(key, {
            ...prev,
            keywords: Array.from(new Set([...prev.keywords, ...evt.keywords])),
            breakdown: {
              finance: prev.breakdown.finance + delta.finance,
              ethics: prev.breakdown.ethics + delta.ethics,
              logistics: prev.breakdown.logistics + delta.logistics,
            },
          });
        }

        setTick((t) => t + 1); // re-render vendor grid
      },
    });

    return () => {
      clearInterval(id);
      stop();
    };
  }, [seed]);

  // Sorted & optionally AOI-filtered vendors
  const vendorsSorted: VendorAgg[] = useMemo(() => {
    const arr = Array.from(vendorMapRef.current.values());
    return arr.sort((a, b) => {
      const ar = recommendationScore(riskFromBreakdown(a.breakdown));
      const br = recommendationScore(riskFromBreakdown(b.breakdown));
      return br - ar; // sort desc by recommendation
    });
  }, [counts, tick]);

  const vendorsVisible = useMemo(() => {
    const bounds = aoi?.bounds as BBox | undefined;
    if (!bounds) return vendorsSorted;

    return vendorsSorted.filter((v) => {
      const center = COUNTRY_CENTER[v.country];
      if (!center) return false;
      const [lat, lon] = center;
      return inBbox(lat, lon, bounds);
    });
  }, [vendorsSorted, aoi]);

  // Save the run when complete (via provider)
  const pct = Math.round((elapsed / TOTAL_MS) * 100);
  const isDone = pct >= 100;

  useEffect(() => {
    if (!isDone || savedRef.current) return;

    savedRef.current = true;

    const useAoi = /\bAOI\s-?\d+(\.\d+)?,\s-?\d+(\.\d+)?\s\(/.test(seed);
    const aoiForRun = useAoi ? readAoiFromSession() : null;

    const vendors = Array.from(vendorMapRef.current.values());

    // Adapt VendorAgg -> Vendor (use name as id for now)
    const vendorsForSave: Vendor[] = vendors.map((v) => ({
      id: makeVendorId(v.name, v.country),
      name: v.name,
      country: v.country,
      keywords: v.keywords,
      breakdown: v.breakdown,
    }));

    providerRef.current
      .saveRun({
        vendors: vendorsForSave,
        counts,
        seed,
        aoi: aoiForRun ?? null,
        createdAt: Date.now(),
      })
      .catch(() => {
        // session fallback (non-fatal)
        try {
          sessionStorage.setItem(
            "kustos:run",
            JSON.stringify({
              vendors,
              counts,
              seed,
              aoi: aoiForRun ?? null,
              createdAt: Date.now(),
            })
          );
        } catch {}
      });
  }, [isDone, counts, seed]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">
        Generating Vendor Landscape…
      </h1>
      <p className="text-white/70 mb-6">
        Streaming early signals while the full report builds.
      </p>

      {/* Ready CTA or Progress */}
      {isDone ? (
        <div className="ready-cta" role="status" aria-live="polite">
          <div className="ready-ring grid place-items-center">
            {/* checkmark */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              className="relative z-10"
            >
              <path
                d="M20 7L9 18l-5-5"
                fill="none"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold">Report ready</div>
            <div className="text-xs text-white/70">
              View the vendor landscape, map & recommendations.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/results/" className="cta-primary">
              View Results
            </a>
            <a href="/dashboard/" className="cta-secondary">
              Summary
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
            <div className="spark-emitter" style={{ left: `${pct}%` }}>
              <span className="spark" style={{ left: 0, top: -2 }} />
              <span className="spark" style={{ left: 2, top: 3 }} />
              <span className="spark" style={{ left: -3, top: 1 }} />
            </div>
          </div>
          <div className="mt-3 text-sm text-white/60">{pct}%</div>
        </>
      )}

      {/* Top row: Radial Heatmap + Word Cloud */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 p-4">
          <div className="mb-3 text-sm text-white/70">Radial Heatmap</div>
          <RadialHeatmap counts={counts} />
        </div>
        <div className="rounded-xl border border-white/10 p-4">
          <div className="mb-3 text-sm text-white/70">Word Cloud</div>
          <WordCloud counts={counts} />
        </div>
      </div>

      {/* Scrollable vendor grid underneath (fills left→right, wraps) */}
      <div className="mt-8 rounded-xl border border-white/10">
        <div className="px-4 py-3 text-sm text-white/70 border-b border-white/10">
          Live Vendor Results (sorted by recommendation and AOI)
        </div>
        <div className="max-h-[420px] overflow-auto p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendorsVisible.map((v) => (
              <VendorCard key={v.name} v={v} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startStream, type VendorHit } from "@/lib/stream";
import RadialHeatmap from "@/components/loading/RadialHeatmap";
import WordCloud from "@/components/loading/WordCloud";
import VendorCard, { type VendorAgg } from "@/components/loading/VendorCard";
import {
  scoreKeywords,
  recommendationScore,
  riskFromBreakdown,
} from "@/lib/scoring";
import { BBox } from "@/lib/aoi";

const TOTAL_MS = 60_000;

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

  // Optional: bias the stream from the query string
  const seed = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("seed") ?? "";
  }, []);

  const savedRef = useRef(false);

  useEffect(() => {
    // progress timer
    const t0 = Date.now();
    const id = setInterval(() => {
      const e = Date.now() - t0;
      setElapsed(Math.min(e, TOTAL_MS));
      if (e >= TOTAL_MS) clearInterval(id);
    }, 200);

    // streaming simulator
    const stop = startStream({
      totalMs: TOTAL_MS,
      intervalMs: 2000,
      seed,
      onEvent(hit: VendorHit) {
        // global keyword counts (for heatmap + word cloud)
        setCounts((prev) => {
          const next = { ...prev };
          for (const k of hit.keywords) next[k] = (next[k] ?? 0) + 1;
          return next;
        });

        // aggregate vendor data + breakdown
        const key = hit.name;
        const map = vendorMapRef.current;
        const prev = map.get(key);
        const delta = scoreKeywords(hit.keywords);

        if (!prev) {
          map.set(key, {
            name: hit.name,
            country: hit.country,
            keywords: Array.from(new Set(hit.keywords)),
            breakdown: delta,
          });
        } else {
          map.set(key, {
            ...prev,
            keywords: Array.from(new Set([...prev.keywords, ...hit.keywords])),
            breakdown: {
              finance: prev.breakdown.finance + delta.finance,
              ethics: prev.breakdown.ethics + delta.ethics,
              logistics: prev.breakdown.logistics + delta.logistics,
            },
          });
        }

        // trigger re-render for vendor grid
        setTick((t) => t + 1);
      },
    });

    return () => {
      clearInterval(id);
      stop();
    };
  }, [seed]);

  const aoi = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("custos:aoi");
      return raw ? (JSON.parse(raw) as { bounds?: BBox }) : null;
    } catch {
      return null;
    }
  }, []);

  const vendorsSorted: VendorAgg[] = useMemo(() => {
    const arr = Array.from(vendorMapRef.current.values());
    return arr.sort((a, b) => {
      const ar = recommendationScore(riskFromBreakdown(a.breakdown));
      const br = recommendationScore(riskFromBreakdown(b.breakdown));
      return br - ar; // sort desc by recommendation
    });
  }, [counts, tick]);

  const vendorsVisible = useMemo(() => {
    const bounds = aoi?.bounds as BBox | undefined; // narrow once
    if (!bounds) return vendorsSorted;

    return vendorsSorted.filter((v) => {
      const center = COUNTRY_CENTER[v.country];
      if (!center) return false;
      const [lat, lon] = center;
      return inBbox(lat, lon, bounds); // now BBox, not possibly undefined
    });
  }, [vendorsSorted, aoi]);

  const pct = Math.round((elapsed / TOTAL_MS) * 100);
  const isDone = pct >= 100;

  useEffect(() => {
    if (pct >= 100 && !savedRef.current) {
      savedRef.current = true;

      // pull AOI if present
      let aoi: any = null;
      try {
        const raw = sessionStorage.getItem("custos:aoi");
        if (raw) aoi = JSON.parse(raw);
      } catch {}

      const vendors = Array.from(vendorMapRef.current.values());
      const payload = {
        vendors,
        counts,
        seed,
        createdAt: Date.now(),
        aoi,
      };
      try {
        sessionStorage.setItem("custos:run", JSON.stringify(payload));
      } catch {}
    }
  }, [pct, counts, seed]);

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

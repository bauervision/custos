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

const TOTAL_MS = 60_000;

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

  const vendorsSorted: VendorAgg[] = useMemo(() => {
    const arr = Array.from(vendorMapRef.current.values());
    return arr.sort((a, b) => {
      const ar = recommendationScore(riskFromBreakdown(a.breakdown));
      const br = recommendationScore(riskFromBreakdown(b.breakdown));
      return br - ar; // sort desc by recommendation
    });
  }, [counts, tick]);

  const pct = Math.round((elapsed / TOTAL_MS) * 100);

  useEffect(() => {
    if (pct >= 100 && !savedRef.current) {
      savedRef.current = true;
      const vendors = Array.from(vendorMapRef.current.values());
      const payload = {
        vendors,
        counts,
        seed,
        createdAt: Date.now(),
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

      {/* Glow progress bar with sparks (styles live in globals.css) */}
      <div className="progress-wrap">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
        <div className="spark-emitter" style={{ left: `${pct}%` }}>
          <span className="spark" style={{ left: 0, top: -2 }} />
          <span className="spark" style={{ left: 2, top: 3 }} />
          <span className="spark" style={{ left: -3, top: 1 }} />
        </div>
      </div>
      <div className="mt-3 text-sm text-white/60">{pct}%</div>

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
          Live Vendor Results (sorted by recommendation)
        </div>
        <div className="max-h-[420px] overflow-auto p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendorsSorted.map((v) => (
              <VendorCard key={v.name} v={v} />
            ))}
          </div>
        </div>
      </div>

      {pct >= 100 && (
        <div className="mt-10">
          <a
            href="/results"
            className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
          >
            View Results
          </a>
        </div>
      )}
    </div>
  );
}

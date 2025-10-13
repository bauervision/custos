"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import RadialHeatmap from "@/components/loading/RadialHeatmap";
import WordCloud from "@/components/loading/WordCloud";
import VendorCard, { type VendorAgg } from "@/components/loading/VendorCard";
import VettingHeroCard from "@/components/loading/VettingHeroCard";
import type { Vendor } from "@/core/types";
import type { StreamEvent, Aoi } from "@/core/types";
import { getProvider } from "@/core/di";
import { makeVendorId } from "@/core/ids";
import {
  scoreKeywords,
  recommendationScore,
  riskFromBreakdown,
} from "@/core/scoring";
import { BBox, readAoiFromSession } from "@/lib/aoi";
import { patchLeafletIcons } from "@/lib/leaflet";

/* ─────────────────────────────────────────────────────────────
   DYNAMIC MAP (client-only)
   MapClient should accept optional props:
     - markers?: { lat:number; lng:number; label?:string }[]
     - fitToMarkers?: boolean
     - height?: number | string
   If your MapClient doesn’t take these yet, you can ignore the props;
   it will still render.
   ───────────────────────────────────────────────────────────── */
const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
});

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

// utils
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

// Client-only wrapper to avoid SSR hydration mismatches
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

/** Vetting intent:
 * - ?company=... → vetting
 * - or seed=VET:Company[,Country]
 * - mode=vet also accepted
 */
function useVettingIntent() {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return {
        isVetting: false as const,
        hasTarget: false,
        company: "",
        country: "",
        seed: "",
      };
    }
    const params = new URLSearchParams(window.location.search);
    const seed = params.get("seed") ?? "";
    const companyQP = (params.get("company") || "").trim();
    const countryQP = (params.get("country") || "").trim();
    const mode = (params.get("mode") || "").toLowerCase();

    let company = companyQP;
    let country = countryQP;

    if (/^vet:/i.test(seed)) {
      const raw = seed.slice(4).trim();
      const [c0, ctry0] = raw.split(",").map((s) => s.trim());
      if (c0 && !company) company = c0;
      if (ctry0 && !country) country = ctry0;
    }

    const isVetting = !!company || /^vet:/i.test(seed) || mode === "vet";
    const hasTarget = !!company;

    return { isVetting, hasTarget, company, country, seed };
  }, []);
}

export default function LoadingPage() {
  const [elapsed, setElapsed] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const vendorMapRef = useRef<Map<string, VendorAgg>>(new Map());
  const [tick, setTick] = useState(0);
  const providerRef = useRef(getProvider());
  const savedRef = useRef(false);

  // finish control
  const doneRef = useRef(false);
  const stopRef = useRef<() => void>(() => {});

  const {
    isVetting,
    hasTarget,
    company: vetCompany,
    country: vetCountry,
    seed,
  } = useVettingIntent();

  // AOI (optional)
  const aoi = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("kustos:aoi");
      return raw ? (JSON.parse(raw) as { bounds?: BBox } & Aoi) : null;
    } catch {
      return null;
    }
  }, []);

  // Map icons patch (Leaflet) once on mount
  useEffect(() => {
    patchLeafletIcons();
  }, []);

  // ---------- progress + stream + simulator ----------
  useEffect(() => {
    // progress
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const e = Date.now() - t0;
      const next = Math.min(e, TOTAL_MS);
      setElapsed(next);
      if (next >= TOTAL_MS) window.clearInterval(id);
    }, 200);

    // start neutral in vetting
    if (isVetting && hasTarget && vetCompany) {
      vendorMapRef.current.clear();
      setTick((t) => t + 1);
    }

    // real provider
    const stop = providerRef.current.streamSignals({
      totalMs: TOTAL_MS,
      intervalMs: 2000,
      seed,
      onEvent(evt: StreamEvent) {
        if (doneRef.current) return; // freeze after done
        if (isVetting && hasTarget && vetCompany && evt.name !== vetCompany)
          return;

        // counts (for visuals)
        setCounts((prev) => {
          const next = { ...prev };
          for (const k of evt.keywords) next[k] = (next[k] ?? 0) + 1;
          return next;
        });

        // aggregate vendor
        const safeCountry =
          evt.country || (evt.name === "Aurora Mineral AG" ? "Germany" : "—");
        const key = makeVendorId(evt.name, safeCountry);
        const map = vendorMapRef.current;
        const prev = map.get(key);
        const delta = scoreKeywords(evt.keywords); // may be zero for some demo terms

        if (!prev) {
          map.set(key, {
            name: evt.name,
            country: safeCountry,
            keywords: Array.from(new Set(evt.keywords)),
            breakdown: {
              finance: delta.finance,
              ethics: delta.ethics,
              logistics: delta.logistics,
            },
          });
        } else {
          map.set(key, {
            ...prev,
            keywords: Array.from(
              new Set([...(prev.keywords ?? []), ...evt.keywords])
            ),
            breakdown: {
              finance: prev.breakdown.finance + delta.finance,
              ethics: prev.breakdown.ethics + delta.ethics,
              logistics: prev.breakdown.logistics + delta.logistics,
            },
          });
        }
        setTick((t) => t + 1);
      },
    });
    stopRef.current = stop;

    // cleanup
    return () => {
      window.clearInterval(id);
      stop();
    };
  }, [seed, isVetting, hasTarget, vetCompany]);

  // mark done (freeze charts & stream)
  const pct = Math.round((elapsed / TOTAL_MS) * 100);
  const isDone = pct >= 100;
  useEffect(() => {
    if (isDone) {
      doneRef.current = true;
      try {
        stopRef.current?.();
      } catch {}
    }
  }, [isDone]);

  // sorted vendors (discovery)
  const vendorsSorted: VendorAgg[] = useMemo(() => {
    const arr = Array.from(vendorMapRef.current.values());
    return arr.sort((a, b) => {
      const ar = recommendationScore(riskFromBreakdown(a.breakdown));
      const br = recommendationScore(riskFromBreakdown(b.breakdown));
      return br - ar;
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

  // vetted agg for hero
  const vetAgg = useMemo(() => {
    if (!(isVetting && hasTarget && vetCompany)) return null;
    const exactKey = makeVendorId(vetCompany, vetCountry || "—");
    const exact = vendorMapRef.current.get(exactKey);
    if (exact) return exact;
    for (const v of vendorMapRef.current.values()) {
      if (v.name === vetCompany) return v;
    }
    return null;
  }, [isVetting, hasTarget, vetCompany, vetCountry, tick]);

  // save run
  useEffect(() => {
    if (!isDone || savedRef.current) return;
    savedRef.current = true;

    const useAoi = /\bAOI\s-?\d+(\.\d+)?,\s-?\d+(\.\d+)?\s\(/.test(seed ?? "");
    const aoiForRun = useAoi ? readAoiFromSession() : null;

    const vendors = Array.from(vendorMapRef.current.values());
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

  // We can show the map when:
  //  - Vetting mode
  //  - We have a vetted vendor agg AND its country is in COUNTRY_CENTER
  const canShowMap =
    isVetting &&
    !!vetAgg &&
    !!COUNTRY_CENTER[vetAgg.country as keyof typeof COUNTRY_CENTER];

  // Build a single marker for vetting map
  const vetMarker = useMemo(() => {
    if (!vetAgg) return null;
    const center = COUNTRY_CENTER[vetAgg.country];
    if (!center) return null;
    return { lat: center[0], lng: center[1], label: vetAgg.name };
  }, [vetAgg]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <ClientOnly>
        <h1 className="text-2xl font-semibold mb-2">
          {isVetting && hasTarget && vetCompany
            ? `Vetting: ${vetCompany}`
            : "Generating Vendor Landscape…"}
        </h1>
      </ClientOnly>

      <p className="text-white/70 mb-6">
        Streaming early signals while the full report builds.
      </p>

      {/* Progress / Ready */}
      <ClientOnly>
        {isDone ? (
          <div className="ready-cta" role="status" aria-live="polite">
            <div className="ready-ring grid place-items-center">
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
                View the {isVetting ? "vetting details" : "vendor landscape"},
                map &amp; recommendations.
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Vetting flow: only Summary (styled as primary). Discovery keeps both. */}
              {isVetting ? (
                <a href="/dashboard/" className="cta-primary">
                  Summary
                </a>
              ) : (
                <>
                  <a href="/results/" className="cta-primary">
                    View Results
                  </a>
                  <a href="/dashboard/" className="cta-secondary">
                    Summary
                  </a>
                </>
              )}
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
            <div
              className="mt-3 text-sm text-white/60"
              suppressHydrationWarning
            >
              {pct}%
            </div>
          </>
        )}
      </ClientOnly>

      {/* Hero (vetting only) */}
      {isVetting && hasTarget && vetCompany && vetAgg && (
        <ClientOnly>
          <div className="mt-6">
            <VettingHeroCard
              v={vetAgg}
              preferredCountry={vetCountry}
              isComplete={isDone}
              progressPct={pct}
            />
          </div>
        </ClientOnly>
      )}

      {/* Map under hero once we know the location (vetting only) */}
      {isVetting && canShowMap && vetMarker && (
        <ClientOnly>
          <div className="mt-6 rounded-xl border border-white/10 overflow-hidden">
            {/* Optional title row */}
            <div className="px-4 py-3 text-sm text-white/70 border-b border-white/10">
              Company Location
            </div>
            {/* MapClient renders full-bleed; give it a fixed height */}
            <div className="relative" style={{ height: 360 }}>
              <MapClient
                // These props are safe if your MapClient ignores unknown props
                markers={[vetMarker]}
                fitToMarkers
                height={360}
              />
            </div>
          </div>
        </ClientOnly>
      )}

      {/* Heatmap & Word Cloud — freeze when done */}
      <ClientOnly>
        {!isDone && (
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
        )}
      </ClientOnly>

      {/* Discovery grid (hidden in vetting) */}
      {!isVetting && (
        <ClientOnly>
          <div className="mt-8 rounded-xl border border-white/10">
            <div className="px-4 py-3 text-sm text-white/70 border-b border-white/10">
              Live Vendor Results (sorted by recommendation and AOI)
            </div>
            <div className="max-h-[420px] overflow-auto p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vendorsVisible.map((v) => (
                  <VendorCard key={`${v.name}-${v.country}`} v={v} />
                ))}
              </div>
            </div>
          </div>
        </ClientOnly>
      )}
    </div>
  );
}

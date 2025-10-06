"use client";

import React, { useEffect, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import type { Breakdown } from "@/lib/scoring";
import { riskGradients } from "@/lib/palette"; // { low, medium, high }

// ---- CONFIG ----
const SHOW_RIBBON = true; // ← set to false to cut the ribbon quickly
const DEMO_TARGETS: Record<string, number> = {
  "Aurora Mineral AG": 90, // final demo rec target (high 80s / low 90s)
};

// ---- ISO2 map ----
const NAME_TO_ISO2: Record<string, string> = {
  "South Africa": "ZA",
  Namibia: "NA",
  Botswana: "BW",
  Germany: "DE",
  Singapore: "SG",
  Norway: "NO",
  Canada: "CA",
  China: "CN",
  UAE: "AE",
};

export type VettingHeroData = {
  name: string;
  country: string;
  keywords: string[];
  breakdown: Breakdown; // { finance:number; ethics:number; logistics:number }
};

type Props = {
  v: VettingHeroData;
  preferredCountry?: string;
  isComplete?: boolean; // pass isDone
  progressPct?: number; // pass pct (0..100) to sync the count-up
};

// ---- UI bits ----
function Flag({
  iso2,
  label,
  size = 72,
}: {
  iso2?: string;
  label?: string;
  size?: number;
}) {
  if (!iso2)
    return (
      <span className="text-2xl" aria-hidden>
        🏳️
      </span>
    );
  return (
    <span
      className={`fi fi-${iso2.toLowerCase()} rounded-[5px] ring-1 ring-black/25 shadow-sm`}
      title={label || iso2}
      aria-label={label || iso2}
      style={{
        display: "inline-block",
        width: size,
        height: Math.round(size * 0.75),
        backgroundSize: "cover",
      }}
    />
  );
}

function StatBar({
  label,
  value,
  show,
}: {
  label: string;
  value: number;
  show: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/70">
        <span>{label}</span>
        <span>{show ? pct : "—"}</span>
      </div>
      <div className="h-2 rounded bg-white/10 overflow-hidden">
        <div
          className="h-2 rounded bg-white/70 transition-all duration-500"
          style={{ width: show ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  );
}

// gentle easing used for progress → score mapping
const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export default function VettingHeroCard({
  v,
  preferredCountry,
  isComplete = false,
  progressPct = 0,
}: Props) {
  // Country/flag (fallback to Germany only if we truly lack a country)
  const countryToShow = preferredCountry || v.country || "Germany";
  const iso2 = useMemo(
    () => NAME_TO_ISO2[countryToShow] || "",
    [countryToShow]
  );

  // Data presence (controls grey/neutral start)
  const hasAnyData =
    (v.keywords?.length ?? 0) > 0 ||
    v.breakdown.finance + v.breakdown.ethics + v.breakdown.logistics > 0;

  // Base target from breakdown: higher score when lower risk
  const avg =
    (v.breakdown.finance + v.breakdown.ethics + v.breakdown.logistics) / 3;
  const baseTarget = Math.max(0, Math.min(100, Math.round(100 - avg)));

  // Demo override (Aurora ≈ 90), otherwise clamp reasonable range
  const finalTarget =
    DEMO_TARGETS[v.name] ?? Math.max(12, Math.min(98, baseTarget));

  // Drive visible recommendation by progress (monotonic ↑, synced to progress)
  const progress01 = progressPct / 100;
  const viewValue = Math.round(finalTarget * easeOut(progress01));

  const mv = useMotionValue(0);
  useEffect(() => {
    const controls = animate(mv, viewValue, {
      type: "spring",
      stiffness: 220,
      damping: 24,
      mass: 0.6,
    });
    return () => controls.stop();
  }, [viewValue, mv]);
  const recText = useTransform(mv, (v) => `${Math.round(v)}`);

  // Tier (for dynamic gradient) uses current visible rec value
  type LowerTier = "low" | "medium" | "high";
  const tier: LowerTier =
    viewValue >= 67 ? "low" : viewValue >= 34 ? "medium" : "high";

  // Start NEUTRAL/grey until we actually have any data
  const neutralGrad = "from-white/[0.06] to-white/[0.02]";
  const grad = hasAnyData ? riskGradients[tier] : neutralGrad;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-tr ${grad}`}
    >
      {/* content */}
      <div className="relative z-10 p-6 lg:p-8 min-h-[280px] flex flex-col">
        <div className="flex items-start justify-between gap-6">
          {/* LEFT */}
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <Flag iso2={iso2} label={countryToShow} size={76} />
              <span>{countryToShow || "—"}</span>
              <span className="mx-1">•</span>
              <span className="uppercase tracking-wide text-xs">
                {hasAnyData ? `${tier} risk` : "analyzing..."}
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-semibold truncate">{v.name}</h2>
          </div>

          {/* RIGHT (just the number; ribbon is anchored to card container) */}
          <div className="relative shrink-0 text-right">
            <div className="text-xs text-white/60">Recommendation</div>
            <div className="text-3xl font-bold leading-none">
              <motion.span>{recText}</motion.span>
            </div>
          </div>
        </div>

        {/* Keywords */}
        {hasAnyData && v.keywords?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {v.keywords.slice(0, 24).map((k) => (
              <span
                key={k}
                className="rounded-full border border-white/15 bg-black/10 px-2.5 py-1 text-xs text-white/85"
              >
                {k}
              </span>
            ))}
          </div>
        )}

        {/* Bars */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatBar
            label="Finance"
            value={v.breakdown.finance}
            show={hasAnyData}
          />
          <StatBar
            label="Ethics"
            value={v.breakdown.ethics}
            show={hasAnyData}
          />
          <StatBar
            label="Logistics"
            value={v.breakdown.logistics}
            show={hasAnyData}
          />
        </div>
      </div>

      {/* Ribbon / Sash — fully inside the card bounds */}
      {SHOW_RIBBON && (
        <AnimatePresence>
          {isComplete && (
            <motion.div
              key="ribbon"
              initial={{ opacity: 0, rotate: 25, scale: 0.92 }}
              animate={{
                opacity: 1,
                rotate: 45,
                scale: 1,
                transition: {
                  delay: 0.2,
                  type: "spring",
                  stiffness: 280,
                  damping: 22,
                },
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`
                pointer-events-none absolute z-50
                top-0 right-0                   
                h-24 w-[200%]                   
                origin-top-right rotate-45 overflow-hidden
                rounded-md shadow-[0_8px_25px_rgba(0,0,0,0.45)]
                bg-gradient-to-r ${
                  tier === "high"
                    ? "from-rose-400 to-orange-400"
                    : tier === "medium"
                    ? "from-amber-300 to-lime-300"
                    : "from-emerald-300 to-cyan-300"
                }
              `}
              aria-label={`Final recommendation badge ${viewValue}`}
            >
              <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(135deg,rgba(255,255,255,.55)_0%,rgba(255,255,255,0)_55%)]" />
              <div className="absolute inset-0 border border-white/10" />
              <div className="absolute inset-0 flex items-center justify-center -rotate-45">
                <div className="text-xl font-extrabold text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">
                  {viewValue}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

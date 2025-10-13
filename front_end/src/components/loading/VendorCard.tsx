"use client";

import {
  categoryForKeyword, // (not used now, but you can remove if unused elsewhere)
  type Breakdown,
  recommendationScore,
  riskFromBreakdown,
} from "@/lib/scoring"; // or "@/lib/scoring" in your tree
import { riskTier, riskGradients } from "@/lib/palette";

// Simple name→ISO map for demo; swap with your canonical source when ready.
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

export type VendorAgg = {
  name: string;
  country: string;
  keywords: string[]; // kept in type for compatibility; not rendered
  breakdown: Breakdown;
};

export default function VendorCard({ v }: { v: VendorAgg }) {
  const risk = riskFromBreakdown(v.breakdown);
  const rec = recommendationScore(risk);
  const tier = riskTier(risk);
  const ribbonGradient = riskGradients[tier]; // e.g., "from-emerald-400/80 to-cyan-300/80"

  const iso = (NAME_TO_ISO2[v.country] || "").toLowerCase();
  const hasFlag = iso.length === 2;

  return (
    <div
      className="
        group relative overflow-hidden rounded-xl
        border border-white/10
      "
    >
      {/* FULL-CARD FLAG BACKDROP */}
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 grid place-items-center">
          {hasFlag ? (
            <span
              className={`fi fi-${iso} block max-w-none`}
              style={{ width: "100%", aspectRatio: "4 / 3", fontSize: 0 }}
            />
          ) : (
            <div className="h-full w-full bg-white/[0.06]" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/10" />
      </div>

      {/* DIAGONAL RIBBON — risk color only */}
      <div
        className={`
    pointer-events-none absolute -right-24 -top-12 z-10
    h-28 w-[12rem] rotate-45 overflow-hidden rounded-md
    shadow-[0_10px_30px_rgba(0,0,0,0.45)]
    bg-gradient-to-r ${ribbonGradient}
  `}
        role="img"
        aria-label={`Risk tier: ${tier}`}
      >
        <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(135deg,rgba(255,255,255,.45)_0%,rgba(255,255,255,0)_50%)]" />
        <div className="absolute inset-0 border border-white/15" />
      </div>

      {/* BODY */}
      <div className="relative p-5 pr-8">
        <div className="min-w-0">
          <div className="relative inline-block max-w-full pr-2">
            {/* streak */}
            <span
              aria-hidden
              className="
          absolute -inset-y-1 -left-6 -right-50 rounded-r-2xl
          bg-gradient-to-r from-black/85 via-black/45 to-transparent
          skew-x-[-12deg] backdrop-blur-[1px]
          [mask-image:linear-gradient(to_right,black_85%,transparent)]
        "
            />
            {/* title */}
            <h3
              className="
          relative z-[15] truncate text-[1.125rem] sm:text-[1.25rem]
          font-semibold tracking-tight text-white
          drop-shadow-[0_1px_0_rgba(0,0,0,0.65)]
        "
              title={v.name}
            >
              {v.name}
            </h3>
          </div>
          <div className="mt-0.5 text-xs text-white/85">{v.country}</div>
        </div>

        <div className="mt-3 text-m shadow-2xl shadow-black text-white/90">
          Recommendation: <span className="font-semibold">{rec}</span>/100
          &nbsp;|&nbsp; Risk: <span className="font-semibold">{risk}</span>
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  color,
  value,
}: {
  label: string;
  color: string;
  value: number;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-white/80">
        {label}
      </div>
      <div className="mt-1 h-2 w-full rounded bg-white/20">
        <div
          className={`h-2 rounded ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-white/85">{Math.round(value)}</div>
    </div>
  );
}

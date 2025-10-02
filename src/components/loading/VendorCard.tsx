"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  categoryForKeyword,
  type Breakdown,
  recommendationScore,
  riskFromBreakdown,
} from "@/lib/scoring";
import { riskTier, riskGradients } from "@/lib/palette";
import { countryFlagEmoji } from "@/lib/flags";

export type VendorAgg = {
  name: string;
  country: string;
  keywords: string[];
  breakdown: Breakdown;
};

function chipClass(k: string) {
  const cat = categoryForKeyword(k);
  switch (cat) {
    case "finance":
      return "border-sky-400/30 text-sky-200 bg-sky-400/10";
    case "ethics":
      return "border-pink-400/30 text-pink-200 bg-pink-400/10";
    case "logistics":
      return "border-amber-400/30 text-amber-200 bg-amber-400/10";
    default:
      return "border-white/15 text-white/80 bg-white/5";
  }
}

export default function VendorCard({ v }: { v: VendorAgg }) {
  const risk = riskFromBreakdown(v.breakdown);
  const rec = recommendationScore(risk);
  const tier = riskTier(risk);
  const gradient = riskGradients[tier];

  return (
    <div className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-4 overflow-hidden">
      {/* Risk ribbon */}
      <div
        className={`pointer-events-none absolute -right-24 -top-10 h-24 w-48 rotate-45 bg-gradient-to-r ${gradient}`}
      />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold">{v.name}</div>
          <div className="text-xs text-white/60 flex items-center gap-1">
            <span className="text-base leading-none">
              {countryFlagEmoji(v.country)}
            </span>
            <span>· {v.country}</span>
          </div>
        </div>

        <div className="mt-2 text-xs text-white/70">
          Recommendation: <span className="font-semibold">{rec}</span>/100
          &nbsp;|&nbsp; Risk: <span className="font-semibold">{risk}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {v.keywords.slice(0, 10).map((k, i) => (
            <span
              key={i}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${chipClass(
                k
              )}`}
            >
              {k}
            </span>
          ))}
        </div>
      </div>

      {/* Hover breakdown */}
      <div
        className="
          absolute inset-x-0 bottom-0 z-20
          translate-y-3 opacity-0
          transition-all duration-200
          group-hover:translate-y-0 group-hover:opacity-100
        "
      >
        <div className="rounded-b-xl border-t border-white/15 bg-black p-3 text-xs shadow-[0_-12px_30px_rgba(0,0,0,0.6)]">
          <div className="mb-2 text-white/80">Risk breakdown</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/60">
                finance
              </div>
              <div className="mt-1 h-2 w-full rounded bg-white/10">
                <div
                  className="h-2 rounded bg-sky-400"
                  style={{ width: `${Math.min(100, v.breakdown.finance)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-white/70">
                {Math.round(v.breakdown.finance)}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/60">
                ethics
              </div>
              <div className="mt-1 h-2 w-full rounded bg-white/10">
                <div
                  className="h-2 rounded bg-pink-400"
                  style={{ width: `${Math.min(100, v.breakdown.ethics)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-white/70">
                {Math.round(v.breakdown.ethics)}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/60">
                logistics
              </div>
              <div className="mt-1 h-2 w-full rounded bg-white/10">
                <div
                  className="h-2 rounded bg-amber-400"
                  style={{ width: `${Math.min(100, v.breakdown.logistics)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-white/70">
                {Math.round(v.breakdown.logistics)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

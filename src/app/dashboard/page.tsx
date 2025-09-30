"use client";

import { useEffect, useMemo, useState } from "react";
import { loadLatestRun } from "@/lib/results";
import type { VendorAgg } from "@/components/loading/VendorCard";
import VendorCard from "@/components/loading/VendorCard";
import Donut from "@/components/dashboard/Donut";
import { recommendationScore, riskFromBreakdown } from "@/lib/scoring";

export default function DashboardPage() {
  const data = useMemo(() => loadLatestRun(), []);
  const [vendors, setVendors] = useState<VendorAgg[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (data?.vendors) setVendors(data.vendors);
    if (data?.counts) setCounts(data.counts);
  }, [data]);

  if (!vendors.length) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold mb-3">
          Summary & Recommendations
        </h1>
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

  const sorted = [...vendors].sort((a, b) => {
    const ar = recommendationScore(riskFromBreakdown(a.breakdown));
    const br = recommendationScore(riskFromBreakdown(b.breakdown));
    return br - ar;
  });
  const top3 = sorted.slice(0, 3);

  // KPIs
  const totalVendors = vendors.length;
  const avgRisk = Math.round(
    vendors.reduce((s, v) => s + riskFromBreakdown(v.breakdown), 0) /
      totalVendors
  );
  const avgRec = 100 - avgRisk;

  // global risk mix (sum of breakdowns across vendors)
  const mix = vendors.reduce(
    (m, v) => {
      m.finance += v.breakdown.finance;
      m.ethics += v.breakdown.ethics;
      m.logistics += v.breakdown.logistics;
      return m;
    },
    { finance: 0, ethics: 0, logistics: 0 }
  );

  const topKeywords = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  function downloadJSON() {
    try {
      const payload = {
        vendors: sorted,
        counts,
        createdAt: data?.createdAt ?? Date.now(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "custos-report.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Summary & Recommendations</h1>
        <div className="flex gap-2">
          <a
            href="/results"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            View Map
          </a>
          <button
            onClick={downloadJSON}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-wide text-white/60">
            Vendors surfaced
          </div>
          <div className="mt-1 text-2xl font-semibold">{totalVendors}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-wide text-white/60">
            Avg recommendation
          </div>
          <div className="mt-1 text-2xl font-semibold">{avgRec}/100</div>
          <div className="text-xs text-white/60">Avg risk: {avgRisk}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-wide text-white/60">
            Top signals
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topKeywords.map(([k, v]) => (
              <span
                key={k}
                className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
              >
                {k} <span className="text-white/40">×{v}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: Risk mix + Prescriptive bullets */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <Donut
            data={[
              { label: "Finance", value: mix.finance },
              { label: "Ethics", value: mix.ethics },
              { label: "Logistics", value: mix.logistics },
            ]}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 text-sm font-medium text-white/80">
            Prescriptive Recommendations
          </div>
          <ul className="list-disc pl-6 space-y-2 text-white/85 text-sm">
            <li>
              Prioritize{" "}
              <span className="font-semibold">
                {top3[0]?.name ?? "the top vendor"}
              </span>{" "}
              and{" "}
              <span className="font-semibold">
                {top3[1]?.name ?? "the next pick"}
              </span>{" "}
              for immediate negotiation.
            </li>
            <li>
              Mitigate ethics exposure via third-party audit and require
              chain-of-custody attestations for award.
            </li>
            <li>
              Lock logistics SLAs to cap lead time variance; pre-clear customs
              and HS codes for {top3[0]?.country ?? "target region"}.
            </li>
            <li>
              Hedge financial risk on tariffs/currency where flagged during the
              run.
            </li>
          </ul>
        </div>
      </div>

      {/* Top Picks */}
      <div className="mt-8">
        <div className="mb-3 text-sm text-white/70">Top Recommendations</div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {top3.map((v) => (
            <div key={v.name}>
              <VendorCard v={v} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect } from "react";
import type { VendorAgg } from "@/components/loading/VendorCard";
import { useSelection } from "@/state/selection";
import { recommendationScore, riskFromBreakdown } from "@/lib/scoring";

function sectionBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 text-sm font-medium text-white/80">{title}</div>
      <div className="text-sm text-white/80">{children}</div>
    </div>
  );
}

export default function VendorReportDialog({
  vendors,
}: {
  vendors: VendorAgg[];
}) {
  const { selectedVendor, setSelectedVendor } = useSelection();
  const vendor = vendors.find((v) => v.name === selectedVendor);

  // close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedVendor(undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelectedVendor]);

  if (!vendor) return null;

  const risk = riskFromBreakdown(vendor.breakdown);
  const rec = recommendationScore(risk);

  // quick derived text
  const riskLabel = risk < 30 ? "Low" : risk < 60 ? "Moderate" : "High";
  const good = vendor.keywords.filter((k) =>
    /esg|traceability|chain-of-custody|permits/i.test(k)
  );
  const bad = vendor.keywords.filter((k) =>
    /labor|poaching|mercury|bankruptcy|sanctions|export controls|strike|port delays/i.test(
      k
    )
  );
  const finK = vendor.keywords.filter((k) =>
    /currency|duty|tariffs|bankruptcy|sanctions|ceo/i.test(k)
  );
  const ethK = vendor.keywords.filter((k) =>
    /labor|poaching|conflict|mercury|environmental|ethics/i.test(k)
  );
  const logK = vendor.keywords.filter((k) =>
    /lead times|customs|outsourcing|geopolitics|port delays|strike/i.test(k)
  );

  return (
    <div className="fixed inset-0 z-[999]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setSelectedVendor(undefined)}
      />
      {/* modal */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b0f14] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
          {/* header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-lg font-semibold">{vendor.name}</div>
              <div className="text-xs text-white/60">{vendor.country}</div>
            </div>
            <button
              onClick={() => setSelectedVendor(undefined)}
              className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm hover:bg-white/10"
            >
              Close
            </button>
          </div>

          {/* body */}
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {sectionBox({
              title: "Background",
              children: (
                <>
                  <div>
                    Recommendation: <span className="font-semibold">{rec}</span>
                    /100
                  </div>
                  <div>
                    Risk: <span className="font-semibold">{risk}</span> (
                    {riskLabel})
                  </div>
                  <div className="mt-2 text-white/70 text-xs">
                    Signals observed during this run. Full report correlates
                    financial, ethical, and logistics risk.
                  </div>
                </>
              ),
            })}

            {sectionBox({
              title: "Signals (Good / Bad)",
              children: (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-emerald-300/90 mb-1">Good</div>
                    <div className="flex flex-wrap gap-1">
                      {good.slice(0, 8).map((k, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px]"
                        >
                          {k}
                        </span>
                      ))}
                      {!good.length && (
                        <span className="text-xs text-white/50">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-rose-300/90 mb-1">Bad</div>
                    <div className="flex flex-wrap gap-1">
                      {bad.slice(0, 8).map((k, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[11px]"
                        >
                          {k}
                        </span>
                      ))}
                      {!bad.length && (
                        <span className="text-xs text-white/50">—</span>
                      )}
                    </div>
                  </div>
                </div>
              ),
            })}

            {sectionBox({
              title: "Risk Breakdown",
              children: (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-white/60">
                      Finance
                    </div>
                    <div className="mt-1 h-2 w-full rounded bg-white/10">
                      <div
                        className="h-2 rounded bg-sky-400"
                        style={{
                          width: `${Math.min(100, vendor.breakdown.finance)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-white/70">
                      {Math.round(vendor.breakdown.finance)}
                    </div>
                    <div className="mt-2 text-[11px] text-white/70">
                      {finK.slice(0, 4).join(", ") || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-white/60">
                      Ethics
                    </div>
                    <div className="mt-1 h-2 w-full rounded bg-white/10">
                      <div
                        className="h-2 rounded bg-pink-400"
                        style={{
                          width: `${Math.min(100, vendor.breakdown.ethics)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-white/70">
                      {Math.round(vendor.breakdown.ethics)}
                    </div>
                    <div className="mt-2 text-[11px] text-white/70">
                      {ethK.slice(0, 4).join(", ") || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-white/60">
                      Logistics
                    </div>
                    <div className="mt-1 h-2 w-full rounded bg-white/10">
                      <div
                        className="h-2 rounded bg-amber-400"
                        style={{
                          width: `${Math.min(
                            100,
                            vendor.breakdown.logistics
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-white/70">
                      {Math.round(vendor.breakdown.logistics)}
                    </div>
                    <div className="mt-2 text-[11px] text-white/70">
                      {logK.slice(0, 4).join(", ") || "—"}
                    </div>
                  </div>
                </div>
              ),
            })}

            {sectionBox({
              title: "Recommendation",
              children: (
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Proceed{" "}
                    {risk < 45
                      ? "with confidence"
                      : risk < 65
                      ? "with caution"
                      : "only after mitigations"}
                    .
                  </li>
                  <li>
                    Mitigate top risks:{" "}
                    {[
                      bad[0] ?? "financing",
                      bad[1] ?? "logistics clearance",
                    ].join(", ")}
                    .
                  </li>
                  <li>
                    Validate on-the-ground facts via third-party audit before
                    award.
                  </li>
                </ul>
              ),
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

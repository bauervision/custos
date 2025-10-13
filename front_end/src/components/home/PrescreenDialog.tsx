// src/components/home/PrescreenDialog.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useKustos } from "@/lib/provider";

// Keep this concise — high-signal “don’t want” flags
export const NEGATIVE_TOPICS = [
  "China based",
  "Sanctioned country",
  "Conflict zone",
  "High-risk region",
  "In business < 10 years",
  "Labor violations",
  "Child labor risk",
  "Poor ESG record",
  "No certifications",
  "Bankruptcy risk",
  "Financial instability",
  "Short operating history",
  "Unreliable logistics",
  "Long lead times",
  "High environmental impact",
] as const;

// Your existing positives (unchanged)
export const POSITIVE_TOPICS = [
  "Africa focus",
  "Europe focus",
  "North America",
  "Local supplier",
  "In business 10+ years",
  "Public company",
  "Private company",
  "SME",
  "Enterprise scale",
  "ISO 9001",
  "ISO 14001",
  "REACH compliant",
  "RoHS compliant",
  "Conflict-free",
  "Chain-of-custody",
  "Traceability",
  "No sanctions",
  "No bankruptcy",
  "Low strike risk",
  "Short lead times",
  "Stable pricing",
  "Pre-cleared customs",
  "ESG leadership",
  "Third-party audits",
  "Labor standards",
  "Low environmental impact",
] as const;

// Back-compat single list (if your component expects SEMANTIC_TOPICS)
export const SEMANTIC_TOPICS = [
  ...NEGATIVE_TOPICS,
  ...POSITIVE_TOPICS,
] as const;

export default function PrescreenDialog() {
  const { prescreen, setPrescreen } = useKustos();
  const [open, setOpen] = useState(false);

  // portal mount gate (SSR-safe)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [includeSet, setIncludeSet] = useState<Set<string>>(
    new Set(prescreen.include)
  );
  const [excludeSet, setExcludeSet] = useState<Set<string>>(
    new Set(prescreen.exclude)
  );

  useEffect(() => {
    if (open) {
      setIncludeSet(new Set(prescreen.include));
      setExcludeSet(new Set(prescreen.exclude));
    }
  }, [open, prescreen.include, prescreen.exclude]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick, true);
    return () => document.removeEventListener("mousedown", onClick, true);
  }, [open]);

  const toggleInclude = (t: string) =>
    setIncludeSet((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else {
        next.add(t);
        setExcludeSet((ex) => {
          const nn = new Set(ex);
          nn.delete(t);
          return nn;
        });
      }
      return next;
    });

  const toggleExclude = (t: string) =>
    setExcludeSet((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else {
        next.add(t);
        setIncludeSet((inc) => {
          const nn = new Set(inc);
          nn.delete(t);
          return nn;
        });
      }
      return next;
    });

  const clearAll = () => {
    setIncludeSet(new Set());
    setExcludeSet(new Set());
  };

  const save = () => {
    setPrescreen({
      include: Array.from(includeSet),
      exclude: Array.from(excludeSet),
    });
    setOpen(false);
  };

  const orderedTopics = useMemo(() => {
    const score = (t: string) =>
      includeSet.has(t) ? 2 : excludeSet.has(t) ? 1 : 0;
    return [...SEMANTIC_TOPICS].sort((a, b) => score(b) - score(a));
  }, [includeSet, excludeSet]);

  const Pill = ({
    label,
    state,
    onClick,
  }: {
    label: string;
    state: "none" | "include" | "exclude";
    onClick: () => void;
  }) => {
    const base =
      "cursor-pointer select-none rounded-full px-3 py-1.5 text-xs transition border";
    const byState =
      state === "include"
        ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/20"
        : state === "exclude"
        ? "border-rose-400/40 bg-rose-400/15 text-rose-200 hover:bg-rose-400/20"
        : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10";
    return (
      <button type="button" onClick={onClick} className={`${base} ${byState}`}>
        {label}
      </button>
    );
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="cta-secondary">
        Prescreen
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-[100]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                {/* panel (true viewport center) */}
                <motion.div
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  className="
                    fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                    w-[min(92vw,48rem)]
                    rounded-2xl border border-white/10 bg-black/80 p-5 shadow-2xl
                  "
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.2 },
                  }}
                  exit={{
                    opacity: 0,
                    y: 8,
                    scale: 0.98,
                    transition: { duration: 0.15 },
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">Prescreen</div>
                      <div className="text-xs text-white/60 mt-0.5">
                        Choose semantic filters to include/exclude during
                        discovery.
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={clearAll}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setOpen(false)}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Include column */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-2 text-sm font-medium text-emerald-300">
                      Include
                      <span className="ml-2 text-xs text-white/50">
                        ({includeSet.size})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {orderedTopics
                        .filter((t) => !excludeSet.has(t)) // ⬅️ hide excluded
                        .map((t) => (
                          <Pill
                            key={`inc-${t}`}
                            label={t}
                            state={includeSet.has(t) ? "include" : "none"} // ⬅️ only include state
                            onClick={() => toggleInclude(t)}
                          />
                        ))}
                      {!orderedTopics.some((t) => !excludeSet.has(t)) && (
                        <div className="text-xs text-white/50">
                          No available items.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Exclude column */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-2 text-sm font-medium text-rose-300">
                      Exclude
                      <span className="ml-2 text-xs text-white/50">
                        ({excludeSet.size})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {orderedTopics
                        .filter((t) => !includeSet.has(t)) // ⬅️ hide included
                        .map((t) => (
                          <Pill
                            key={`exc-${t}`}
                            label={t}
                            state={excludeSet.has(t) ? "exclude" : "none"} // ⬅️ only exclude state
                            onClick={() => toggleExclude(t)}
                          />
                        ))}
                      {!orderedTopics.some((t) => !includeSet.has(t)) && (
                        <div className="text-xs text-white/50">
                          No available items.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button onClick={save} className="cta-primary">
                      Save Prescreen
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

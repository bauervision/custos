"use client";

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import {
  CATEGORY_PLACEHOLDER,
  CATEGORY_EXAMPLES,
  getCategory,
  type CategoryKey,
  DEFAULT_VETTING_COMPANIES,
} from "@/lib/categories";
import CategoryToolbar from "@/components/home/CategoryToolbar";
import PrescreenDialog from "@/components/home/PrescreenDialog";
import { useKustos } from "@/lib/provider";

const container: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      when: "beforeChildren",
      staggerChildren: 0.06,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function HomePage() {
  const { vendorMode, setVendorMode, prescreen, setPrescreen } = useKustos();

  // Empty by default so placeholder is visible
  const [query, setQuery] = useState("");
  const [userEdited, setUserEdited] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Category toolbar
  const [category, setCategory] = useState<CategoryKey>("materials");
  const [promptKey, setPromptKey] = useState(0);
  const selected = useMemo(() => getCategory(category), [category]);
  const examples = CATEGORY_EXAMPLES[category];

  const onPick = (next: CategoryKey) => {
    setCategory(next);
    setQuery((prev) =>
      userEdited ? prev : CATEGORY_EXAMPLES[next]?.[0] ?? prev
    );
    setPromptKey((k) => k + 1);
  };

  // "/" to focus textarea
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const seed = query.trim();
  // Reserve space for extras based on selected chips (capped)
  const CHIP_ROW_H = 28; // ~1.75rem row height
  const EXTRA_BASE = 140; // baseline space (no chips)
  const EXTRA_CAP = 260; // hard cap to prevent layout jumps

  const selCount = prescreen.include.length + prescreen.exclude.length;
  // assume ~5 chips per row on average; clamp rows to keep things tidy
  const estRows = Math.min(4, Math.ceil(selCount / 5));
  const EXTRAS_MIN_H = Math.min(EXTRA_CAP, EXTRA_BASE + estRows * CHIP_ROW_H);

  // --- Toggle slider (measured) ---
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const vetRef = useRef<HTMLButtonElement | null>(null);
  const disRef = useRef<HTMLButtonElement | null>(null);
  const [slider, setSlider] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const recalcSlider = () => {
    const wrap = wrapRef.current;
    const btn = vendorMode === "vetting" ? vetRef.current : disRef.current;
    if (!wrap || !btn) return;
    const wrapRect = wrap.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setSlider({
      left: btnRect.left - wrapRect.left, // relative to wrapper
      width: btnRect.width,
    });
  };

  // measure on mount, on mode change, and on resize
  useLayoutEffect(() => {
    // next frame ensures DOM has settled
    const id = requestAnimationFrame(recalcSlider);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorMode]);

  useEffect(() => {
    const onResize = () => recalcSlider();
    window.addEventListener("resize", onResize);
    // font loading can shift widths; recalc once fonts are ready
    if (document?.fonts?.ready) {
      document.fonts.ready.then(() => recalcSlider()).catch(() => {});
    }
    recalcSlider();
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.main
      className="
        relative overflow-hidden overflow-x-hidden
        min-h-[calc(100vh-120px)]
      "
      style={{ scrollbarGutter: "stable both-edges" }}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-80 w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-white/5 blur-2xl" />
      </div>

      {/* Hero */}
      <section className="relative bg-grid">
        <div className="mx-auto max-w-6xl px-4 h-[calc(100vh-120px)] grid place-items-center -mt-4 overflow-hidden ">
          <div className="w-full flex gap-6 items-start max-h-full overflow-visible">
            {/* Left toolbar */}
            <motion.div className="shrink-0" variants={item}>
              <CategoryToolbar selected={category} onSelect={onPick} />
            </motion.div>

            {/* Right column */}
            <div className="flex-1 min-w-0">
              <motion.h1
                variants={item}
                className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl"
              >
                From{" "}
                <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                  Origin
                </span>{" "}
                to{" "}
                <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                  Outcome
                </span>
              </motion.h1>

              <motion.p
                variants={item}
                className="mt-4 max-w-2xl text-white/70"
              >
                Kustos AI is the guardian of supply chain integrity. From the
                moment materials are sourced to their final deployment, Custos
                provides AI-powered oversight, regional risk analysis, and
                vendor accountability. Built for agencies that demand
                transparency, security, and strategic foresight.
              </motion.p>

              {/* Selected category pill */}
              <motion.div
                key={category}
                variants={item}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-emerald-300"
                  aria-hidden
                >
                  <path d={selected.iconPath} fill="currentColor" />
                </svg>
                <span className="text-xs uppercase tracking-wide text-white/80">
                  Category:
                </span>
                <span className="text-sm font-medium">{selected.label}</span>
              </motion.div>

              {/* Toggle with emerald gradient slider (measured left/width) */}
              <motion.div variants={item} className="mt-4">
                <div
                  ref={wrapRef}
                  className="inline-flex relative rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-1 shadow-inner"
                >
                  {/* animated slider */}
                  <motion.span
                    className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-emerald-300 to-cyan-300"
                    initial={false}
                    animate={{ left: slider.left, width: slider.width }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                      mass: 0.6,
                    }}
                  />
                  {/* buttons */}
                  <button
                    ref={vetRef}
                    onClick={() => setVendorMode("vetting")}
                    className={[
                      "relative z-10 h-9 px-3 text-sm rounded-lg transition",
                      vendorMode === "vetting"
                        ? "text-black font-semibold"
                        : "text-emerald-200/90 hover:text-white",
                    ].join(" ")}
                    aria-pressed={vendorMode === "vetting"}
                  >
                    <span className="relative z-10">Vendor Vetting</span>
                  </button>
                  <button
                    ref={disRef}
                    onClick={() => setVendorMode("discovery")}
                    className={[
                      "relative z-10 h-9 px-3 text-sm rounded-lg transition",
                      vendorMode === "discovery"
                        ? "text-black font-semibold"
                        : "text-emerald-200/90 hover:text-white",
                    ].join(" ")}
                    aria-pressed={vendorMode === "discovery"}
                  >
                    <span className="relative z-10">Vendor Discovery</span>
                  </button>
                </div>

                {/* Helper text with fixed height (no vertical shift) */}
                <div className="mt-1.5 h-5 overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={vendorMode}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
                      }}
                      exit={{
                        opacity: 0,
                        y: -4,
                        transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
                      }}
                      className="text-xs text-white/60 leading-5"
                    >
                      {vendorMode === "vetting"
                        ? "Vetting: analyze a single known vendor. Enter the exact company name."
                        : "Discovery: prescreen with filters, map candidates, then vet."}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Prompt card */}
              <motion.div
                key={promptKey + "-" + vendorMode}
                layout
                variants={item}
                className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[0_10px_50px_rgba(0,0,0,0.25)] backdrop-blur"
              >
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setUserEdited(true);
                  }}
                  rows={4}
                  className="w-full resize-none rounded-xl bg-black/30 p-4 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-cyan-400"
                  placeholder={
                    vendorMode === "vetting"
                      ? 'Type the exact company name (e.g., "Aurora Mineral AG")'
                      : CATEGORY_PLACEHOLDER[category] ||
                        'e.g., "I need material X from region Y"'
                  }
                />

                {/* CTA row: fixed height, no wrap (prevents bumps) */}
                <div className="mt-3 flex flex-nowrap items-center justify-between gap-3 min-h-[44px]">
                  <div className="text-xs text-white/50">
                    Press{" "}
                    <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">
                      /
                    </kbd>{" "}
                    to focus
                  </div>

                  <div className="flex flex-nowrap items-center gap-2">
                    {vendorMode === "discovery" && (
                      <>
                        <PrescreenDialog />
                        <a
                          href="/map?zoom=world"
                          className="rounded-lg border border-white/20 px-4 py-2 text-white/90 hover:bg-white/10"
                        >
                          Start with Map →
                        </a>
                      </>
                    )}
                    <a
                      href={`/loading/?seed=${encodeURIComponent(seed)}`}
                      className="rounded-lg bg-gradient-to-r from-cyan-400/90 to-emerald-400/90 px-4 py-2 text-black font-semibold hover:from-cyan-300 hover:to-emerald-300"
                    >
                      {vendorMode === "vetting" ? "Run Vetting" : "Run Report"}
                    </a>
                  </div>
                </div>

                {/* Stable extras area (keeps card height identical across modes) */}
                <div className="mt-3" style={{ minHeight: EXTRAS_MIN_H }}>
                  {/* Suggested prompts */}
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center gap-2 text-xs text-white/60">
                      {/* spark icon */}
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5 text-emerald-300"
                        aria-hidden
                      >
                        <path
                          d="M12 2l1.7 4.6L18 8l-4.3 1.4L12 14l-1.7-4.6L6 8l4.3-1.4L12 2Zm6 9 1 2.7L22 15l-3 1 .9 2.6L18 17l-1.9 1.6L17 16l-3-1 3-.3L18 11Z"
                          fill="currentColor"
                        />
                      </svg>
                      {vendorMode === "vetting"
                        ? "Previously vetted"
                        : "Previous prompts"}
                    </div>

                    <ul className="flex flex-wrap gap-2">
                      {(vendorMode === "vetting"
                        ? DEFAULT_VETTING_COMPANIES
                        : examples
                      ).map((ex) => (
                        <li key={ex}>
                          <button
                            type="button"
                            onClick={() => {
                              setQuery(ex);
                              setUserEdited(true);
                              setPromptKey((k) => k + 1); // replay pop
                              inputRef.current?.focus();
                            }}
                            className="group rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-left text-xs text-white/70
                     hover:bg-white/[0.08] hover:border-emerald-300/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                            aria-label={`Use suggested ${
                              vendorMode === "vetting" ? "company" : "prompt"
                            }: ${ex}`}
                          >
                            <span className="italic opacity-80 group-hover:opacity-100">
                              “{ex}”
                            </span>
                            <span className="ml-2 inline-flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                              {/* arrow */}
                              <svg
                                viewBox="0 0 24 24"
                                className="w-3.5 h-3.5"
                                aria-hidden
                              >
                                <path
                                  d="M13 5l7 7-7 7M4 12h15"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </motion.main>
  );
}

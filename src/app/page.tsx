"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import KeywordMarquee from "@/components/KeywordMarquee";
import {
  CATEGORY_PLACEHOLDER,
  CATEGORY_EXAMPLES,
  getCategory,
  type CategoryKey,
} from "@/lib/categories";
import CategoryToolbar from "@/components/home/CategoryToolbar";

const EXAMPLE = "I need to source raw earth materials from South Africa";
const KEYWORDS_ROW_A = [
  "logistics",
  "tariffs",
  "ethics",
  "bankruptcy",
  "outsourcing",
  "permits",
  "traceability",
  "ESG",
  "sanctions",
  "chain-of-custody",
  "supply risk",
  "lead times",
  "customs",
  "geopolitics",
  "export controls",
];
const KEYWORDS_ROW_B = [
  "diamond",
  "mercury",
  "cobalt",
  "rare earths",
  "platinum",
  "nickel",
  "conflict zones",
  "labor",
  "CEO turnover",
  "strike risk",
  "port delays",
  "currency",
  "duty",
  "HS codes",
  "environmental impact",
];

export default function HomePage() {
  const [query, setQuery] = useState(EXAMPLE);
  const [userEdited, setUserEdited] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Category Toolbar
  const [category, setCategory] = useState<CategoryKey>("materials");
  const [promptKey, setPromptKey] = useState(0);
  const selected = useMemo(() => getCategory(category), [category]);
  const examples = CATEGORY_EXAMPLES[category];

  function onPick(next: CategoryKey) {
    setCategory(next);
    // If user hasn’t typed custom text, auto-fill with the first example
    setQuery((prev) =>
      userEdited ? prev : CATEGORY_EXAMPLES[next]?.[0] ?? prev
    );
    setPromptKey((k) => k + 1); // replay pop
  }

  // Quick UX sugar: press "/" to focus the prompt
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

  return (
    <div className="relative overflow-hidden">
      {/* Soft background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-80 w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-white/5 blur-2xl" />
      </div>

      {/* Hero */}
      <section className="relative bg-grid">
        {/* left toolbar */}

        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24 flex gap-6">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.04 }}
            className="shrink-0"
          >
            <CategoryToolbar selected={category} onSelect={onPick} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5 }}
              className="mt-4 max-w-2xl text-white/70"
            >
              Kustos AI is the guardian of supply chain integrity. From the
              moment materials are sourced to their final deployment, Custos
              provides AI-powered oversight, regional risk analysis, and vendor
              accountability. Built for agencies that demand transparency,
              security, and strategic foresight.
            </motion.p>

            {/* selection header */}
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
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

            {/* Prompt box */}
            <motion.div
              key={promptKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5 }}
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
                  CATEGORY_PLACEHOLDER[category] ||
                  'e.g., "I need material X from region Y"'
                }
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-white/50">
                  Press{" "}
                  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">
                    /
                  </kbd>{" "}
                  to focus
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/loading/?seed=${encodeURIComponent(query)}`}
                    className="rounded-lg bg-gradient-to-r from-cyan-400/90 to-emerald-400/90 px-4 py-2 text-black font-semibold hover:from-cyan-300 hover:to-emerald-300"
                  >
                    Run Report
                  </a>
                  <a
                    href="/map"
                    className="rounded-lg border border-white/20 px-4 py-2 text-white/90 hover:bg-white/10"
                  >
                    Start with Map →
                  </a>
                </div>
              </div>

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
                  Previous prompts
                </div>

                <ul className="flex flex-wrap gap-2">
                  {examples.map((ex) => (
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
                        aria-label={`Use suggested prompt: ${ex}`}
                      >
                        <span className="italic opacity-80 group-hover:opacity-100">
                          “{ex}”
                        </span>
                        <span className="ml-2 inline-flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                          {/* insert arrow */}
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
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-6 grid gap-3 sm:grid-cols-3"
            >
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">
                  Scan speed
                </div>
                <div className="mt-1 text-xl font-semibold">
                  ~1m demo • ~10m live
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">
                  Risk lenses
                </div>
                <div className="mt-1 text-xl font-semibold">
                  Finance · Ethics · Logistics
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">
                  Outcome
                </div>
                <div className="mt-1 text-xl font-semibold">
                  Prescriptive picks & map
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Keyword marquee (double row, opposite directions) */}
        <div className="border-y border-white/10 bg-black/30 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <KeywordMarquee items={KEYWORDS_ROW_A} />
            <KeywordMarquee items={KEYWORDS_ROW_B} reverse className="mt-2" />
          </div>
        </div>
      </section>

      {/* Secondary section: two-path entry */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <a
              href="/loading"
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-300/40 hover:bg-white/[0.05]"
            >
              <div className="text-sm text-cyan-300/90">Prompt Mode</div>
              <div className="mt-1 text-xl font-semibold">
                Natural Language → Vendor Landscape
              </div>
              <p className="mt-2 text-white/70">
                Type your need. We’ll stream emerging companies, keywords, and
                early risk signals while the report builds.
              </p>
              <div className="mt-4 text-sm text-white/70 group-hover:text-white/90">
                Try it now →
              </div>
            </a>

            <a
              href="/map"
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-emerald-300/40 hover:bg-white/[0.05]"
            >
              <div className="text-sm text-emerald-300/90">Map Mode</div>
              <div className="mt-1 text-xl font-semibold">
                Pick a Region → Draw AOI
              </div>
              <p className="mt-2 text-white/70">
                Start from geography. Draw your area of interest; add the
                material. We’ll auto-zoom and highlight vendor pins.
              </p>
              <div className="mt-4 text-sm text-white/70 group-hover:text-white/90">
                Open the map →
              </div>
            </a>
          </div>

          {/* Trust strip (text placeholders for demo) */}
          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/60">
            Trusted by teams evaluating complex supply chains — ready to demo
            for Google & Government stakeholders.
          </div>
        </div>
      </section>
    </div>
  );
}

export type Breakdown = { finance: number; ethics: number; logistics: number };
export type Category = "finance" | "ethics" | "logistics" | "unknown";

const LEXICON: Record<Category, { bad?: string[]; good?: string[] }> = {
  finance: {
    bad: [
      "bankruptcy",
      "currency",
      "duty",
      "tariffs",
      "sanctions",
      "export controls",
      "CEO turnover",
    ],
    good: ["permits", "traceability", "ESG", "chain-of-custody"],
  },
  ethics: {
    bad: [
      "labor",
      "poaching",
      "conflict zones",
      "mercury",
      "environmental impact",
      "ethics",
    ],
    good: ["ESG", "traceability", "chain-of-custody"],
  },
  logistics: {
    bad: [
      "port delays",
      "lead times",
      "customs",
      "outsourcing",
      "geopolitics",
      "strike risk",
    ],
    good: ["logistics"], // neutral->slightly good signal in context
  },
  unknown: {},
};

export function categoryForKeyword(k: string): Category {
  const kw = k.toLowerCase();
  for (const cat of ["finance", "ethics", "logistics"] as Category[]) {
    const bad = LEXICON[cat].bad ?? [];
    const good = LEXICON[cat].good ?? [];
    if (bad.some((x) => kw.includes(x))) return cat;
    if (good.some((x) => kw.includes(x))) return cat;
  }
  return "unknown";
}

export function scoreKeywords(keywords: string[]): Breakdown {
  const b: Breakdown = { finance: 0, ethics: 0, logistics: 0 };
  for (const raw of keywords) {
    const k = raw.toLowerCase();
    const cat = categoryForKeyword(k);
    if (cat === "unknown") continue;
    const bad = (LEXICON[cat].bad ?? []).some((x) => k.includes(x));
    const good = (LEXICON[cat].good ?? []).some((x) => k.includes(x));
    if (bad) b[cat] += 12; // penalty weights
    else if (good) b[cat] = Math.max(0, b[cat] - 6); // small credit
    else b[cat] += 4; // neutral noise
  }
  // cap 0..100
  b.finance = Math.min(100, b.finance);
  b.ethics = Math.min(100, b.ethics);
  b.logistics = Math.min(100, b.logistics);
  return b;
}

export function riskFromBreakdown(b: Breakdown): number {
  // Weighted blend (ethics a bit heavier for demo)
  return Math.min(
    100,
    Math.round(b.finance * 0.35 + b.ethics * 0.4 + b.logistics * 0.25)
  );
}

export function recommendationScore(risk: number): number {
  return Math.max(0, 100 - risk);
}

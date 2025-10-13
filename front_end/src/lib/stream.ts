// src/lib/stream.ts
export type VendorHit = {
  name: string;
  country: string;
  keywords: string[]; // may include repeats on purpose
};

export type StreamOptions = {
  totalMs?: number;
  intervalMs?: number;
  seed?: string;
  onEvent: (hit: VendorHit) => void;
};

const COMPANIES = [
  { name: "EarthMaterials Inc.", country: "China" },
  { name: "Unique Trade Corp.", country: "Canada" },
  { name: "Kalahari Extractives", country: "South Africa" },
  { name: "Platina Global", country: "Botswana" },
  { name: "Meridian Metals", country: "Namibia" },
  { name: "Trans-Continental Logistics", country: "UAE" },
  { name: "Aurora Mineral AG", country: "Germany" },
  { name: "Sable Ridge Holdings", country: "South Africa" },
  { name: "Pacific Crown Trading", country: "Singapore" },
  { name: "NorthCape Commodities", country: "Norway" },
];

type Tier = "LOW" | "MEDIUM" | "HIGH";
const COMPANY_TIER: Record<string, Tier> = {
  "Aurora Mineral AG": "LOW",
  "NorthCape Commodities": "LOW",
  "Unique Trade Corp.": "LOW",

  "Platina Global": "MEDIUM",
  "Meridian Metals": "MEDIUM",
  "Pacific Crown Trading": "MEDIUM",

  "EarthMaterials Inc.": "HIGH",
  "Kalahari Extractives": "HIGH",
  "Sable Ridge Holdings": "HIGH",
  "Trans-Continental Logistics": "HIGH",
};

// Positive/compliance signals (push green)
const POSITIVE = [
  "renewable energy",
  "iso-14001",
  "reach compliant",
  "rohs compliant",
  "third-party audits",
  "living wage policy",
  "supplier code of conduct",
  "traceability",
  "grievance mechanism",
  "fair trade compliance",
];

// Moderate negatives (push amber)
const MODERATE_NEG = [
  "coal power usage",
  "water stress region",
  "incomplete supplier audits",
  "overtime violations (minor)",
  "corrective action plan",
  "diesel fleet",
  "scope-3 not reported",
  "noise complaints",
  "lead times",
  "outsourcing",
];

// Severe negatives (push red)
const SEVERE_NEG = [
  "bankruptcy",
  "deforestation risk",
  "illegal sourcing",
  "forced labor allegations",
  "child labor reports",
  "unsafe working conditions",
  "sanctions exposure",
  "ofac sdn proximity",
  "opaque supply chain",
  "beneficial ownership unknown",
  "water contamination",
  "no third-party audits",
  "anti-corruption policy missing",
  "conflict minerals",
];

// Low-impact ambience to keep heatmap lively
const AMBIENT = [
  "logistics",
  "tariffs",
  "permits",
  "chain-of-custody",
  "customs",
  "geopolitics",
  "export controls",
  "cobalt",
  "platinum",
  "nickel",
  "labor",
  "strike risk",
  "port delays",
  "currency",
  "HS codes",
  "environmental impact",
];

function pick<T>(arr: T[], n: number) {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < Math.min(n, arr.length)) {
    out.push(copy.splice((Math.random() * copy.length) | 0, 1)[0]);
  }
  return out;
}

// like pick but allows repeats (to amplify scoring)
function pickWithRepeats<T>(arr: T[], n: number) {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[(Math.random() * arr.length) | 0]);
  return out;
}

function seedBias(seed?: string): string[] {
  if (!seed) return [];
  const s = seed.toLowerCase();
  const hits: string[] = [];
  if (s.includes("south africa")) hits.push("cobalt", "platinum", "diamond");
  if (/\b(sanction|ofac|sdn)\b/.test(s))
    hits.push("sanctions exposure", "ofac sdn proximity");
  if (/\b(child|labor)\b/.test(s))
    hits.push("child labor reports", "unsafe working conditions");
  if (/\b(renewable|green|solar|wind)\b/.test(s))
    hits.push("renewable energy", "iso-14001");
  return hits;
}

/**
 * Stronger tier shaping:
 *  LOW (new/revisit): 4–5 POSITIVE + 0–1 AMBIENT
 *  MED  (new): 2 MOD + 2 SEVERE(+repeats) + 0–1 AMBIENT
 *  MED  (rev): 1 MOD + 2 SEVERE(+repeats)
 *  HIGH (new): 6–9 SEVERE(+repeats) + 0–1 AMBIENT
 *  HIGH (rev): 3–5 SEVERE(+repeats)
 * We intentionally allow repeats to pump the delta in scoreKeywords().
 */
function makeKeywordsFor(name: string, revisit = false): string[] {
  const tier = COMPANY_TIER[name] ?? "MEDIUM";

  if (tier === "LOW") {
    return [
      ...pick(POSITIVE, 4 + ((Math.random() * 2) | 0)), // 4–5
      ...(Math.random() < 0.5 ? pick(AMBIENT, 1) : []),
    ];
  }

  if (tier === "MEDIUM") {
    if (!revisit) {
      return [
        ...pick(MODERATE_NEG, 2),
        ...pickWithRepeats(SEVERE_NEG, 2), // repeats amplify
        ...(Math.random() < 0.4 ? pick(AMBIENT, 1) : []),
      ];
    }
    return [...pick(MODERATE_NEG, 1), ...pickWithRepeats(SEVERE_NEG, 2)];
  }

  // HIGH
  if (!revisit) {
    return [
      ...pickWithRepeats(SEVERE_NEG, 6 + ((Math.random() * 4) | 0)), // 6–9 severe (with repeats)
      ...(Math.random() < 0.3 ? pick(AMBIENT, 1) : []),
    ];
  }
  return [
    ...pickWithRepeats(SEVERE_NEG, 3 + ((Math.random() * 3) | 0)), // 3–5 severe
  ];
}

export function startStream({
  totalMs = 60_000,
  intervalMs = 2000,
  seed,
  onEvent,
}: StreamOptions) {
  const t0 = Date.now();
  let timer: any = null;
  const used = new Set<string>();
  const bias = seedBias(seed);

  const tick = () => {
    const elapsed = Date.now() - t0;
    const isNewCompany = Math.random() < 0.7 || used.size === 0;

    if (isNewCompany) {
      const pool = COMPANIES.filter((c) => !used.has(c.name));
      const company =
        pool[(Math.random() * pool.length) | 0] ??
        COMPANIES[(Math.random() * COMPANIES.length) | 0];

      used.add(company.name);

      // IMPORTANT: do NOT Set-dedupe — duplicates should pass through
      const kws = [...makeKeywordsFor(company.name, false), ...bias];
      onEvent({ name: company.name, country: company.country, keywords: kws });
    } else {
      const seen = Array.from(used);
      const name = seen[(Math.random() * seen.length) | 0];
      const country = COMPANIES.find((c) => c.name === name)?.country ?? "—";

      const kws = [...makeKeywordsFor(name, true), ...bias];

      onEvent({ name, country, keywords: kws });
    }

    if (elapsed >= totalMs) clearInterval(timer);
  };

  tick(); // first burst
  timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}

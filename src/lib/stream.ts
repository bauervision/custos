export type VendorHit = {
  name: string;
  country: string;
  keywords: string[];
};

export type StreamOptions = {
  totalMs?: number; // default 60s
  intervalMs?: number; // default 2000ms
  seed?: string; // optional prompt seed
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

const KEYWORDS_CORE = [
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
  "mercury",
  "diamond",
  "cobalt",
  "platinum",
  "nickel",
  "labor",
  "strike risk",
  "port delays",
  "currency",
  "duty",
  "HS codes",
  "environmental impact",
];

function pick<T>(arr: T[], n: number) {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < Math.min(n, arr.length)) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

export function startStream({
  totalMs = 60_000,
  intervalMs = 2000,
  seed,
  onEvent,
}: StreamOptions) {
  // Nudge keyword bias from seed (super light-touch)
  const bias = seed?.toLowerCase().includes("south africa")
    ? ["cobalt", "platinum", "diamond"]
    : [];
  const t0 = Date.now();
  let timer: any = null;
  let used = new Set<string>();

  const tick = () => {
    const elapsed = Date.now() - t0;
    // Occasionally revisit an existing company with more keywords
    const newCompany = Math.random() < 0.7 || used.size === 0;

    if (newCompany) {
      const pool = COMPANIES.filter((c) => !used.has(c.name));
      const company =
        pool[Math.floor(Math.random() * pool.length)] ??
        COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
      used.add(company.name);
      const kws = [
        ...bias,
        ...pick(KEYWORDS_CORE, 3 + Math.floor(Math.random() * 3)),
      ];
      onEvent({ name: company.name, country: company.country, keywords: kws });
    } else {
      // amplify keywords on a seen company
      const seen = Array.from(used);
      const name = seen[Math.floor(Math.random() * seen.length)];
      const country = COMPANIES.find((c) => c.name === name)?.country ?? "—";
      const kws = [
        ...bias,
        ...pick(KEYWORDS_CORE, 2 + Math.floor(Math.random() * 2)),
      ];
      onEvent({ name, country, keywords: kws });
    }

    if (elapsed >= totalMs) {
      clearInterval(timer);
    }
  };

  // First burst is immediate, then interval
  tick();
  timer = setInterval(tick, intervalMs);

  return () => clearInterval(timer);
}

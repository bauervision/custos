// lib/palette.ts
// Small, bright but readable accents for dark UI
const ACCENTS = [
  "#22d3ee", // cyan-400
  "#facc15", // amber-400
  "#a78bfa", // violet-400
  "#34d399", // emerald-400
  "#f472b6", // pink-400
  "#60a5fa", // blue-400
  "#fb923c", // orange-400
  "#4ade80", // green-400
];

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export const RISK_ACCENT = {
  low: "#22d3ee", // cyan-400   (your low-risk ribbon)
  mid: "#facc15", // amber-400  (your medium-risk ribbon)
  high: "#fb7185", // rose-400   (your high-risk ribbon)
};

export function accentForRisk(risk: number): string {
  if (risk < 30) return RISK_ACCENT.low;
  if (risk < 60) return RISK_ACCENT.mid;
  return RISK_ACCENT.high;
}

// Deterministic accent by any stable key (vendor name works well)
export function accentForKey(key: string): string {
  return ACCENTS[hashString(key) % ACCENTS.length];
}

// Convert #rrggbb to rgba(r,g,b,a)
export function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const riskGradients = {
  low: "from-emerald-400/80 to-cyan-300/80",
  medium: "from-amber-300/80 to-yellow-300/80",
  high: "from-rose-400/80 to-pink-400/80",
};

export function riskTier(risk: number) {
  if (risk < 30) return "low" as const;
  if (risk < 60) return "medium" as const;
  return "high" as const;
}

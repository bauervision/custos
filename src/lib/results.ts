import type { VendorAgg } from "@/components/loading/VendorCard";

export type RunData = {
  vendors: VendorAgg[];
  counts: Record<string, number>;
  seed?: string;
  aoi?: any;
  createdAt: number;
};

export function loadLatestRun(): RunData | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("custos:run");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RunData;
  } catch {
    return null;
  }
}
